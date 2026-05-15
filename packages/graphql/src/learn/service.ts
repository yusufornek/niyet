import { createHash } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import { fetchLatestTuikInflationRate } from '../inflation/tuik';

interface SourceSnapshotInput {
  sourceType: 'EGM_PAGE' | 'EGM_PDF' | 'TUIK_API';
  sourceUrl: string;
  sourceTitle: string;
  effectiveDate?: Date | null;
  rawContent: string;
}

interface LearnFactInput {
  key: string;
  label: string;
  valueText: string;
  valueNumber?: number | null;
  unit?: string | null;
  confidence: number;
  sourceUrl: string;
  effectiveDate?: Date | null;
}

interface LearnCardInput {
  orderNo: number;
  slug: string;
  title: string;
  shortDescription: string;
  body: string;
  sourceName: string;
  sourceUrl: string;
  sourceUpdatedAt?: Date | null;
  quiz: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    explanationLlm?: string | null;
  }>;
}

export interface LearnRefreshResult {
  created: boolean;
  packId: string | null;
  reason: string;
}

export class LearnService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async refreshDailyPack(): Promise<LearnRefreshResult> {
    const now = this.now();
    const packDate = startOfDay(now);

    const existing = await this.prisma.learnDailyPack.findUnique({
      where: { packDate },
      select: { id: true, status: true },
    });
    if (existing?.status === 'PUBLISHED') {
      return { created: false, packId: existing.id, reason: 'already_published_today' };
    }

    const draft = await this.buildDraftPack(now);
    if (!draft) {
      return { created: false, packId: null, reason: 'source_fetch_failed' };
    }

    const sourceHash = stableHash(
      JSON.stringify({
        facts: draft.facts.map((f) => [f.key, f.valueText, f.sourceUrl]),
        cards: draft.cards.map((c) => [c.slug, c.title, c.shortDescription]),
      }),
    );

    const latestPublished = await this.prisma.learnDailyPack.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { packDate: 'desc' },
      select: { id: true, sourceHash: true },
    });
    if (latestPublished?.sourceHash === sourceHash) {
      return { created: false, packId: latestPublished.id, reason: 'same_hash_skip' };
    }

    const validation = validateDraft(draft);
    if (!validation.ok) {
      return { created: false, packId: null, reason: `validation_failed:${validation.reason}` };
    }

    const published = await this.prisma.$transaction(async (tx) => {
      const pack = await tx.learnDailyPack.upsert({
        where: { packDate },
        update: {
          status: 'PUBLISHED',
          sourceHash,
          summary: draft.summary,
          publishedAt: now,
        },
        create: {
          packDate,
          status: 'PUBLISHED',
          sourceHash,
          summary: draft.summary,
          publishedAt: now,
        },
      });

      await tx.learnSourceSnapshot.deleteMany({ where: { packId: pack.id } });
      await tx.learnFact.deleteMany({ where: { packId: pack.id } });
      await tx.learnQuizItem.deleteMany({ where: { card: { packId: pack.id } } });
      await tx.learnCard.deleteMany({ where: { packId: pack.id } });

      for (const snapshot of draft.snapshots) {
        await tx.learnSourceSnapshot.create({
          data: {
            packId: pack.id,
            sourceType: snapshot.sourceType,
            sourceUrl: snapshot.sourceUrl,
            sourceTitle: snapshot.sourceTitle,
            effectiveDate: snapshot.effectiveDate ?? null,
            contentHash: stableHash(snapshot.rawContent),
            rawContent: snapshot.rawContent,
          },
        });
      }

      for (const fact of draft.facts) {
        await tx.learnFact.create({
          data: {
            packId: pack.id,
            key: fact.key,
            label: fact.label,
            valueText: fact.valueText,
            valueNumber: fact.valueNumber ?? null,
            unit: fact.unit ?? null,
            confidence: fact.confidence,
            sourceUrl: fact.sourceUrl,
            effectiveDate: fact.effectiveDate ?? null,
          },
        });
      }

      for (const card of draft.cards) {
        const createdCard = await tx.learnCard.create({
          data: {
            packId: pack.id,
            orderNo: card.orderNo,
            slug: card.slug,
            title: card.title,
            shortDescription: card.shortDescription,
            body: card.body,
            sourceName: card.sourceName,
            sourceUrl: card.sourceUrl,
            sourceUpdatedAt: card.sourceUpdatedAt ?? null,
          },
        });
        for (const quizItem of card.quiz) {
          await tx.learnQuizItem.create({
            data: {
              cardId: createdCard.id,
              question: quizItem.question,
              optionsJson: quizItem.options,
              correctIndex: quizItem.correctIndex,
              explanation: quizItem.explanation,
              explanationLlm: quizItem.explanationLlm ?? null,
            },
          });
        }
      }

      return pack;
    });

    await this.emitLearnUpdateNotifications(published.id);
    return { created: true, packId: published.id, reason: 'published' };
  }

  async completeCard(userId: string, cardId: string, quizAnswers: number[]) {
    const card = await this.prisma.learnCard.findUnique({
      where: { id: cardId },
      include: {
        pack: true,
        quizItems: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!card || card.pack.status !== 'PUBLISHED') {
      throw new Error('Kart bulunamadı.');
    }

    const quizScore = card.quizItems.reduce((score, item, i) => {
      return score + (quizAnswers[i] === item.correctIndex ? 1 : 0);
    }, 0);
    const xpEarned = 20 + quizScore * 10;

    const now = this.now();
    const state = await this.prisma.$transaction(async (tx) => {
      await tx.userLearnProgress.upsert({
        where: { userId_cardId: { userId, cardId } },
        update: {
          quizScore,
          xpEarned,
          completedAt: now,
          packId: card.packId,
        },
        create: {
          userId,
          packId: card.packId,
          cardId,
          quizScore,
          xpEarned,
          completedAt: now,
        },
      });

      const currentState = await tx.userLearnState.findUnique({ where: { userId } });
      const totalXp = (currentState?.totalXp ?? 0) + xpEarned;
      const level = Math.max(1, Math.floor(totalXp / 100) + 1);
      const streakDays = computeNextStreak(
        currentState?.lastActiveDate ?? null,
        currentState?.streakDays ?? 0,
        now,
      );

      return tx.userLearnState.upsert({
        where: { userId },
        update: {
          totalXp,
          level,
          streakDays,
          lastActiveDate: startOfDay(now),
        },
        create: {
          userId,
          totalXp,
          level,
          streakDays,
          lastActiveDate: startOfDay(now),
        },
      });
    });

    return { state, xpEarned, quizScore };
  }

  async getLeaderboardForUserCircles(userId: string) {
    const memberships = await this.prisma.circleMembership.findMany({
      where: { userId },
      select: { circleId: true },
    });
    const circleIds = memberships.map((m) => m.circleId);
    if (circleIds.length === 0) return [];

    const users = await this.prisma.circleMembership.findMany({
      where: { circleId: { in: circleIds } },
      include: {
        user: {
          include: {
            learnState: true,
          },
        },
      },
    });

    const bestByUser = new Map<string, { userId: string; userName: string; totalXp: number }>();
    for (const row of users) {
      const current = bestByUser.get(row.userId);
      const totalXp = row.user.learnState?.totalXp ?? 0;
      if (!current || current.totalXp < totalXp) {
        bestByUser.set(row.userId, {
          userId: row.userId,
          userName: row.user.name,
          totalXp,
        });
      }
    }

    return [...bestByUser.values()].sort((a, b) => b.totalXp - a.totalXp).slice(0, 20);
  }

  private async emitLearnUpdateNotifications(packId: string) {
    const members = await this.prisma.user.findMany({ select: { id: true } });
    if (members.length === 0) return;

    await this.prisma.notification.createMany({
      data: members.map((u) => ({
        userId: u.id,
        type: 'LEARN_UPDATE',
        title: 'Yeni günlük öğrenme içeriği hazır',
        body: 'BES, devlet katkısı ve fon kavramları için bugünün mini derslerini tamamlayabilirsin.',
        payload: { packId },
      })),
    });
  }

  private async buildDraftPack(now: Date): Promise<{
    summary: string;
    snapshots: SourceSnapshotInput[];
    facts: LearnFactInput[];
    cards: LearnCardInput[];
  } | null> {
    const besUrl = 'https://www.egm.org.tr/bireysel-emeklilik/bireysel-emeklilik-nedir/';
    const stateContributionUrl = 'https://www.egm.org.tr/bireysel-emeklilik/devlet-katkisi/';
    const fundsUrl = 'https://www.egm.org.tr/bireysel-emeklilik/gonullu-bes-fonlari/';
    const legislationUrl = 'https://www.egm.org.tr/mevzuat/bireysel-emeklilik-mevzuati/';

    const [besPage, statePage, fundsPage, legislationPage, tuikInflation] = await Promise.all([
      fetchText(this.fetchImpl, besUrl),
      fetchText(this.fetchImpl, stateContributionUrl),
      fetchText(this.fetchImpl, fundsUrl),
      fetchText(this.fetchImpl, legislationUrl),
      fetchLatestTuikInflationRate(this.fetchImpl).catch(() => null),
    ]);

    if (!besPage || !statePage || !fundsPage || !legislationPage) return null;

    const besText = cleanText(besPage);
    const stateText = cleanText(statePage);
    const fundsText = cleanText(fundsPage);
    const legislationText = cleanText(legislationPage);

    const contributionPct = extractFirstPercent(stateText);
    const hasRegulation = /Devlet Katkısı Hakkında Yönetmelik/i.test(legislationText);

    const facts: LearnFactInput[] = [
      {
        key: 'BES_CONCEPT',
        label: 'BES tanımı',
        valueText: clipText(besText, 220),
        confidence: 95,
        sourceUrl: besUrl,
      },
      {
        key: 'STATE_CONTRIBUTION_RATE',
        label: 'Devlet katkısı oranı',
        valueText: contributionPct != null ? `%${contributionPct}` : 'Belirlenemedi',
        valueNumber: contributionPct,
        unit: 'percent',
        confidence: contributionPct != null ? 95 : 30,
        sourceUrl: stateContributionUrl,
      },
      {
        key: 'FUND_CONCEPT',
        label: 'Fon türleri özeti',
        valueText: clipText(fundsText, 220),
        confidence: 90,
        sourceUrl: fundsUrl,
      },
      {
        key: 'REGULATION_EXISTS',
        label: 'İlgili mevzuat doğrulaması',
        valueText: hasRegulation
          ? 'Devlet katkısı hakkında yönetmelik listede mevcut.'
          : 'Yönetmelik listede bulunamadı.',
        confidence: hasRegulation ? 90 : 40,
        sourceUrl: legislationUrl,
      },
    ];

    if (tuikInflation) {
      facts.push({
        key: 'LATEST_TUIK_INFLATION',
        label: 'Güncel TÜFE yıllık oranı',
        valueText: `%${tuikInflation.annualRate.toFixed(2)}`,
        valueNumber: tuikInflation.annualRate,
        unit: 'percent',
        confidence: 95,
        sourceUrl: tuikInflation.sourceUrl,
        effectiveDate: tuikInflation.publishedAt,
      });
    }

    const cards: LearnCardInput[] = [
      {
        orderNo: 1,
        slug: 'bes-nedir',
        title: 'BES nedir?',
        shortDescription: 'Bireysel emeklilik sisteminin amacını 2 dakikada kavra.',
        body: clipText(besText, 700),
        sourceName: 'EGM',
        sourceUrl: besUrl,
        quiz: [
          {
            question: 'BES hangi ana amaca hizmet eder?',
            options: [
              'Kısa vadeli tüketim kredisi',
              'Emeklilik dönemine ek gelir birikimi',
              'Vergisiz döviz alımı',
            ],
            correctIndex: 1,
            explanation: 'BES, uzun vadeli birikim ile emeklilikte ek gelir sağlamayı hedefler.',
          },
        ],
      },
      {
        orderNo: 2,
        slug: 'devlet-katkisi',
        title: 'Devlet katkısı nasıl işler?',
        shortDescription: 'Katkı payına karşılık devlet desteğinin temel mantığı.',
        body: clipText(stateText, 700),
        sourceName: 'EGM',
        sourceUrl: stateContributionUrl,
        quiz: [
          {
            question: 'Sayfada geçen devlet katkısı oranı hangisidir?',
            options: ['%10', '%20', '%30'],
            correctIndex: contributionPct === 30 ? 2 : contributionPct === 10 ? 0 : 1,
            explanation: 'Oran resmi EGM içeriğinden güncel olarak çekilir.',
          },
        ],
      },
      {
        orderNo: 3,
        slug: 'fon-kavramlari',
        title: 'Fon kavramları',
        shortDescription: 'BES fonlarının farklı risk/getiri profillerini öğren.',
        body: clipText(fundsText, 700),
        sourceName: 'EGM',
        sourceUrl: fundsUrl,
        quiz: [
          {
            question: 'Fonlar arasında seçim yaparken hangi unsur önemlidir?',
            options: ['Risk tercihi ve vade', 'Sadece son 1 günlük fiyat', 'Rastgele seçim'],
            correctIndex: 0,
            explanation: 'Fon seçimi risk profili ve hedef vade ile uyumlu olmalıdır.',
          },
        ],
      },
    ];

    return {
      summary: 'Bugünün öğrenme paketi BES, devlet katkısı ve fon kavramlarını kapsar.',
      snapshots: [
        {
          sourceType: 'EGM_PAGE',
          sourceUrl: besUrl,
          sourceTitle: 'BES nedir',
          rawContent: besPage,
        },
        {
          sourceType: 'EGM_PAGE',
          sourceUrl: stateContributionUrl,
          sourceTitle: 'Devlet katkısı',
          rawContent: statePage,
        },
        {
          sourceType: 'EGM_PAGE',
          sourceUrl: fundsUrl,
          sourceTitle: 'Gönüllü BES fonları',
          rawContent: fundsPage,
        },
        {
          sourceType: 'EGM_PDF',
          sourceUrl: legislationUrl,
          sourceTitle: 'Bireysel emeklilik mevzuatı',
          rawContent: legislationPage,
        },
        ...(tuikInflation
          ? [
              {
                sourceType: 'TUIK_API' as const,
                sourceUrl: tuikInflation.sourceUrl,
                sourceTitle: 'TÜİK TÜFE',
                effectiveDate: tuikInflation.publishedAt,
                rawContent: JSON.stringify(tuikInflation),
              },
            ]
          : []),
      ],
      facts,
      cards,
    };
  }
}

function validateDraft(input: { facts: LearnFactInput[]; cards: LearnCardInput[] }) {
  if (input.cards.length < 3) return { ok: false as const, reason: 'insufficient_cards' };
  if (input.facts.length < 3) return { ok: false as const, reason: 'insufficient_facts' };
  const missingSource = input.facts.find((f) => !f.sourceUrl);
  if (missingSource) return { ok: false as const, reason: 'fact_missing_source' };
  const percentFact = input.facts.find((f) => f.unit === 'percent');
  if (percentFact && percentFact.valueNumber == null) {
    return { ok: false as const, reason: 'percent_parse_failed' };
  }
  return { ok: true as const };
}

async function fetchText(fetchImpl: typeof fetch, url: string): Promise<string | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { 'user-agent': 'niyet-learn-bot/1.0' },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function cleanText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clipText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1).trim()}…`;
}

function extractFirstPercent(text: string): number | null {
  const match = text.match(/%(\d{1,2}(?:[.,]\d{1,2})?)/);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function computeNextStreak(lastActiveDate: Date | null, currentStreak: number, now: Date): number {
  if (!lastActiveDate) return Math.max(1, currentStreak || 1);
  const today = startOfDay(now);
  const last = startOfDay(lastActiveDate);
  const diffDays = Math.round((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return Math.max(1, currentStreak);
  if (diffDays === 1) return Math.max(1, currentStreak + 1);
  return 1;
}

function startOfDay(value: Date): Date {
  const dt = new Date(value);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
