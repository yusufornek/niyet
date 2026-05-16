/**
 * CategoryAutoSaveService — Ortalama-alti kategori farkini otomatik
 * MicroContribution'a donusturur.
 *
 * Sorumluluk:
 * - Aktif rule'lari listele
 * - Her rule icin core `computeCategoryShortfall` ile fark hesabi yap
 * - Trigger edilebilirse MicroContribution yarat + Notification gonder
 * - Idempotency: ayni rule + ay icin MicroContribution.sourceRef
 *   prefix kontrolu (ayda en fazla 1 kez)
 *
 * Mimari notlar:
 * - Pure logic core'da (`computeCategoryShortfall`).
 * - DB tarafi sadece "okuyup yazma" — business kararlari core yapar.
 * - Dependency injection: prisma + now (clock) testte degistirilebilir.
 */
import {
  computeCategoryShortfall,
  monthKey,
  type AutoSaveTxShape,
  type CategoryShortfallResult,
} from '@niyet/core';
import type { PrismaClient, SpendingCategory, CategoryAutoSaveRule } from '@prisma/client';

export interface CategoryAutoSaveDependencies {
  prisma: PrismaClient;
  now: () => Date;
}

export interface CategoryAutoSaveOutcome {
  ruleId: string;
  userId: string;
  category: SpendingCategory;
  monthYear: string;
  status:
    | 'TRIGGERED'
    | 'SKIPPED_ALREADY_TRIGGERED'
    | 'SKIPPED_INSUFFICIENT_HISTORY'
    | 'SKIPPED_NO_SHORTFALL';
  shortfall: CategoryShortfallResult;
  microContributionId?: string;
  notificationId?: string;
}

export interface CategoryAutoSaveBatchResult {
  monthYear: string;
  usersProcessed: number;
  rulesProcessed: number;
  triggered: number;
  skipped: number;
  errors: Array<{ ruleId: string; userId: string; error: string }>;
}

export class CategoryAutoSaveService {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;

  constructor(deps: CategoryAutoSaveDependencies) {
    this.prisma = deps.prisma;
    this.now = deps.now;
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────

  async listForUser(userId: string): Promise<CategoryAutoSaveRule[]> {
    return this.prisma.categoryAutoSaveRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createRule(
    userId: string,
    input: { category: SpendingCategory; lookbackMonths?: number },
  ): Promise<CategoryAutoSaveRule> {
    const lookback = input.lookbackMonths ?? 3;
    if (lookback < 1 || lookback > 12 || !Number.isInteger(lookback)) {
      throw new Error('lookbackMonths 1 ile 12 arasinda olmali.');
    }
    return this.prisma.categoryAutoSaveRule.create({
      data: {
        userId,
        category: input.category,
        lookbackMonths: lookback,
        active: true,
      },
    });
  }

  async deleteRule(userId: string, ruleId: string): Promise<CategoryAutoSaveRule> {
    const owned = await this.prisma.categoryAutoSaveRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!owned) throw new Error('Kural bulunamadi veya erisim reddedildi.');
    return this.prisma.categoryAutoSaveRule.delete({ where: { id: ruleId } });
  }

  async setActive(userId: string, ruleId: string, active: boolean): Promise<CategoryAutoSaveRule> {
    const owned = await this.prisma.categoryAutoSaveRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!owned) throw new Error('Kural bulunamadi veya erisim reddedildi.');
    return this.prisma.categoryAutoSaveRule.update({
      where: { id: ruleId },
      data: { active },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Hesap + tetikleme
  // ─────────────────────────────────────────────────────────────

  /**
   * Tek bir rule icin: bu ay (veya verilen ay) farkini hesapla ve gerekirse
   * MicroContribution yarat. Idempotent — ayni ay + rule icin ikinci kez
   * cagrildiginda SKIPPED_ALREADY_TRIGGERED doner.
   */
  async runRule(
    rule: CategoryAutoSaveRule,
    targetMonthYear?: string,
  ): Promise<CategoryAutoSaveOutcome> {
    const monthYear = targetMonthYear ?? monthKey(this.now());

    // Idempotency check — bu rule + ay icin onceden MicroContribution var mi?
    const sourceRef = buildSourceRef(rule.id, monthYear);
    const existing = await this.prisma.microContribution.findFirst({
      where: { userId: rule.userId, sourceRef },
      select: { id: true },
    });
    if (existing) {
      return {
        ruleId: rule.id,
        userId: rule.userId,
        category: rule.category,
        monthYear,
        status: 'SKIPPED_ALREADY_TRIGGERED',
        shortfall: emptyShortfall(monthYear),
      };
    }

    // Transaction'lari cek (lookback + target ay'i kapsayacak kadar geriye).
    const oldest = oldestNeededDate(monthYear, rule.lookbackMonths);
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId: rule.userId,
        category: rule.category,
        occurredAt: { gte: oldest },
      },
      select: { amount: true, category: true, occurredAt: true },
    });

    const txShape: AutoSaveTxShape[] = txs.map((t) => ({
      amount: Number(t.amount),
      category: t.category,
      occurredAt: t.occurredAt,
    }));

    const shortfall = computeCategoryShortfall({
      transactions: txShape,
      category: rule.category,
      monthYear,
      lookbackMonths: rule.lookbackMonths,
    });

    if (!shortfall.hasSufficientHistory) {
      return {
        ruleId: rule.id,
        userId: rule.userId,
        category: rule.category,
        monthYear,
        status: 'SKIPPED_INSUFFICIENT_HISTORY',
        shortfall,
      };
    }
    if (!shortfall.shouldTrigger) {
      return {
        ruleId: rule.id,
        userId: rule.userId,
        category: rule.category,
        monthYear,
        status: 'SKIPPED_NO_SHORTFALL',
        shortfall,
      };
    }

    // Aktarim
    const triggeredAt = this.now();
    const created = await this.prisma.$transaction(async (db) => {
      const mc = await db.microContribution.create({
        data: {
          userId: rule.userId,
          amount: shortfall.shortfallAmount,
          category: rule.category,
          source: 'CATEGORY_BUCKET',
          sourceRef,
          status: 'COMMITTED',
          committedAt: triggeredAt,
          note: `Otomatik fark aktarimi: ${shortfall.averageAmount} ortalama, ${shortfall.currentAmount} harcama (${monthYear})`,
        },
      });
      await db.categoryAutoSaveRule.update({
        where: { id: rule.id },
        data: {
          lastTriggeredAt: triggeredAt,
          lastTriggeredMonth: monthYear,
          lastTransferAmount: shortfall.shortfallAmount,
        },
      });
      const notif = await db.notification.create({
        data: {
          userId: rule.userId,
          type: 'CONTRIBUTION_ACCEPTED',
          title: 'Otomatik fark aktarildi',
          body: `${formatCategory(rule.category)} kategorisinde bu ay ortalamanin ${shortfall.shortfallAmount} TL altinda harcadin — fark emeklilik katkina eklendi.`,
          payload: {
            contributionId: mc.id,
            source: 'CATEGORY_AUTO_SAVE',
            category: rule.category,
            monthYear,
            shortfallAmount: shortfall.shortfallAmount,
            averageAmount: shortfall.averageAmount,
            currentAmount: shortfall.currentAmount,
          },
        },
      });
      return { mc, notif };
    });

    return {
      ruleId: rule.id,
      userId: rule.userId,
      category: rule.category,
      monthYear,
      status: 'TRIGGERED',
      shortfall,
      microContributionId: created.mc.id,
      notificationId: created.notif.id,
    };
  }

  /**
   * Bir kullanicinin tum aktif rule'lari icin bu ay'i hesapla + tetikle.
   * UI'daki "Simdi hesapla" butonu bunu cagirir.
   */
  async runForUser(userId: string, targetMonthYear?: string): Promise<CategoryAutoSaveOutcome[]> {
    const rules = await this.prisma.categoryAutoSaveRule.findMany({
      where: { userId, active: true },
    });
    const outcomes: CategoryAutoSaveOutcome[] = [];
    for (const rule of rules) {
      outcomes.push(await this.runRule(rule, targetMonthYear));
    }
    return outcomes;
  }

  /**
   * Bir kural icin "eger simdi tetiklensem ne olur" preview'i.
   * MicroContribution YARATMAZ. UI'da kullaniciya gostermek icin.
   */
  async previewRule(
    rule: CategoryAutoSaveRule,
    targetMonthYear?: string,
  ): Promise<CategoryShortfallResult> {
    const monthYear = targetMonthYear ?? monthKey(this.now());
    const oldest = oldestNeededDate(monthYear, rule.lookbackMonths);
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId: rule.userId,
        category: rule.category,
        occurredAt: { gte: oldest },
      },
      select: { amount: true, category: true, occurredAt: true },
    });
    const txShape: AutoSaveTxShape[] = txs.map((t) => ({
      amount: Number(t.amount),
      category: t.category,
      occurredAt: t.occurredAt,
    }));
    return computeCategoryShortfall({
      transactions: txShape,
      category: rule.category,
      monthYear,
      lookbackMonths: rule.lookbackMonths,
    });
  }
}

function buildSourceRef(ruleId: string, monthYear: string): string {
  return `auto-save:${monthYear}:${ruleId}`;
}

function oldestNeededDate(monthYear: string, lookbackMonths: number): Date {
  const [yStr, mStr] = monthYear.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  // Lookback aylar dahil — month-1-lookback. Buffer icin ay basina ek 1 gun
  // gerekmiyor; Date.UTC(month, 1)'den 'gte' yeterli.
  return new Date(Date.UTC(year, month - 1 - lookbackMonths, 1, 0, 0, 0, 0));
}

function emptyShortfall(monthYear: string): CategoryShortfallResult {
  return {
    monthYear,
    currentAmount: 0,
    averageAmount: null,
    lookback: [],
    lookbackMonthsAnalyzed: 0,
    hasSufficientHistory: false,
    shortfallAmount: 0,
    shortfallPct: null,
    shouldTrigger: false,
  };
}

function formatCategory(c: SpendingCategory): string {
  const map: Record<string, string> = {
    MARKET: 'Market',
    FOOD_DELIVERY: 'Yemek Siparisi',
    COFFEE: 'Kahve',
    DINING_OUT: 'Disarida Yemek',
    TRANSPORT: 'Ulasim',
    FUEL: 'Yakit',
    BILLS: 'Faturalar',
    SUBSCRIPTIONS: 'Abonelikler',
    ONLINE_SHOPPING: 'Online Alisveris',
    CLOTHING: 'Giyim',
    HEALTH: 'Saglik',
    ENTERTAINMENT: 'Eglence',
    EDUCATION: 'Egitim',
    SPORTS: 'Spor',
    OTHER: 'Diger',
  };
  return map[c] ?? c;
}
