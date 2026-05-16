import { createHash } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

interface ParsedFeedItem {
  title: string;
  url: string;
  description: string;
  publishedAt: Date;
  sourceName: string;
  sourceKind: 'official' | 'market';
}

interface SourceAdapter {
  sourceName: string;
  sourceKind: 'official' | 'market';
  url: string;
}

const OFFICIAL_SOURCES: SourceAdapter[] = [
  {
    sourceName: 'TCMB Basın Duyuruları',
    sourceKind: 'official',
    url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/RSS/Basin+Duyurulari',
  },
  {
    sourceName: 'TCMB Yayınlar',
    sourceKind: 'official',
    url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/RSS/Yayinlar',
  },
];

const MARKET_SOURCES: SourceAdapter[] = [
  {
    sourceName: 'Google News TR Ekonomi',
    sourceKind: 'market',
    url: 'https://news.google.com/rss/search?q=ekonomi+OR+enflasyon+OR+faiz&hl=tr&gl=TR&ceid=TR:tr',
  },
  {
    sourceName: 'Google News TR Piyasalar',
    sourceKind: 'market',
    url: 'https://news.google.com/rss/search?q=borsa+OR+dolar+OR+tcmb&hl=tr&gl=TR&ceid=TR:tr',
  },
];

const IMPORTANT_KEYWORDS = [
  'faiz',
  'enflasyon',
  'ppk',
  'tcmb',
  'merkez bankası',
  'tüik',
  'dolar',
  'kur',
  'rezerv',
  'bütçe',
  'işsizlik',
  'büyüme',
  'asgari ücret',
  'vergi',
];

const IMPORTANT_THRESHOLD = 70;

export interface FinanceNewsRefreshResult {
  inserted: number;
  importantInserted: number;
  notificationsCreated: number;
  scanned: number;
  reason: string;
}

export class FinanceNewsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async refreshFeed(): Promise<FinanceNewsRefreshResult> {
    const allSources = [...OFFICIAL_SOURCES, ...MARKET_SOURCES];

    const batches = await Promise.all(
      allSources.map(async (source) => {
        const xml = await fetchText(this.fetchImpl, source.url);
        if (!xml) return [] as ParsedFeedItem[];
        return parseRss(xml, source);
      }),
    );

    const parsed = batches.flat();
    if (parsed.length === 0) {
      return {
        inserted: 0,
        importantInserted: 0,
        notificationsCreated: 0,
        scanned: 0,
        reason: 'source_fetch_failed',
      };
    }

    const normalized = parsed
      .map((item) => {
        const title = cleanText(item.title);
        const sourceUrl = normalizeUrl(item.url);
        if (!title || !sourceUrl) return null;

        const summaryShort = buildShortSummary(title, item.description);
        const importanceScore = scoreImportance({
          title,
          summaryShort,
          sourceKind: item.sourceKind,
          publishedAt: item.publishedAt,
          now: this.now(),
        });
        const isImportant = importanceScore >= IMPORTANT_THRESHOLD;

        return {
          title,
          summaryShort,
          sourceName: item.sourceName,
          sourceUrl,
          publishedAt: item.publishedAt,
          isImportant,
          importanceScore,
          dedupeHash: stableHash(`${title}::${sourceUrl}`),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 60);

    if (normalized.length === 0) {
      return {
        inserted: 0,
        importantInserted: 0,
        notificationsCreated: 0,
        scanned: parsed.length,
        reason: 'no_valid_items',
      };
    }

    const existing = await this.prisma.$queryRaw<Array<{ dedupeHash: string }>>`
      SELECT "dedupeHash"
      FROM "FinanceNewsItem"
      WHERE "dedupeHash" = ANY(${normalized.map((n) => n.dedupeHash)})
    `;
    const existingSet = new Set(existing.map((e) => e.dedupeHash));

    const newItems = normalized.filter((item) => !existingSet.has(item.dedupeHash));
    if (newItems.length === 0) {
      return {
        inserted: 0,
        importantInserted: 0,
        notificationsCreated: 0,
        scanned: parsed.length,
        reason: 'no_new_items',
      };
    }

    for (const item of newItems) {
      await this.prisma.$executeRaw`
        INSERT INTO "FinanceNewsItem"
        ("id","title","summaryShort","sourceName","sourceUrl","publishedAt","isImportant","importanceScore","dedupeHash","createdAt")
        VALUES
        (${createIdFromHash(item.dedupeHash)}, ${item.title}, ${item.summaryShort}, ${item.sourceName}, ${item.sourceUrl}, ${item.publishedAt}, ${item.isImportant}, ${item.importanceScore}, ${item.dedupeHash}, ${this.now()})
        ON CONFLICT ("dedupeHash") DO NOTHING
      `;
    }

    const importantItems = newItems.filter((item) => item.isImportant);
    let notificationsCreated = 0;

    if (importantItems.length > 0) {
      const persisted = await this.prisma.$queryRaw<Array<{ id: string; title: string }>>`
        SELECT "id","title"
        FROM "FinanceNewsItem"
        WHERE "dedupeHash" = ANY(${importantItems.map((item) => item.dedupeHash)})
      `;

      const users = await this.prisma.user.findMany({ select: { id: true } });
      const notificationRows = persisted.flatMap((news) =>
        users.map((user) => ({
          userId: user.id,
          type: 'FINANCE_NEWS_IMPORTANT' as const,
          title: 'Önemli finans haberi',
          body: news.title,
          payload: { newsId: news.id },
        })),
      );

      if (notificationRows.length > 0) {
        const result = await this.prisma.notification.createMany({ data: notificationRows });
        notificationsCreated = result.count;
      }
    }

    return {
      inserted: newItems.length,
      importantInserted: importantItems.length,
      notificationsCreated,
      scanned: parsed.length,
      reason: 'ok',
    };
  }
}

function createIdFromHash(hash: string): string {
  return `news_${hash.slice(0, 18)}`;
}

function parseRss(xml: string, source: SourceAdapter): ParsedFeedItem[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1] ?? '');
  const parsed: ParsedFeedItem[] = [];

  for (const rawItem of items) {
    const title = decodeHtml(getTagValue(rawItem, 'title'));
    const link = decodeHtml(getTagValue(rawItem, 'link'));
    const description = decodeHtml(getTagValue(rawItem, 'description'));
    const pubDateRaw = decodeHtml(getTagValue(rawItem, 'pubDate'));

    const publishedAt = parsePublishedAt(pubDateRaw);
    if (!title || !link || !publishedAt) continue;

    parsed.push({
      title,
      url: link,
      description,
      publishedAt,
      sourceName: source.sourceName,
      sourceKind: source.sourceKind,
    });
  }

  return parsed;
}

function getTagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return (match?.[1] ?? '').trim();
}

async function fetchText(fetchImpl: typeof fetch, url: string): Promise<string | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { 'user-agent': 'niyet-finance-news-bot/1.0' },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function cleanText(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildShortSummary(title: string, description: string): string {
  const cleanTitle = normalizeHeadline(title);
  const sourceTail = extractSourceTail(title);
  let cleanDesc = cleanText(description);

  if (sourceTail) {
    const escaped = escapeRegExp(sourceTail);
    cleanDesc = cleanDesc.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '').trim();
  }

  if (cleanDesc.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
    cleanDesc = cleanDesc
      .slice(cleanTitle.length)
      .replace(/^[:\-.–—\s]+/, '')
      .trim();
  }
  cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();

  if (!cleanDesc || cleanDesc.length < 24) {
    return cleanTitle.length <= 220 ? cleanTitle : `${cleanTitle.slice(0, 219).trim()}…`;
  }
  if (cleanDesc.length <= 220) return cleanDesc;
  return `${cleanDesc.slice(0, 219).trim()}…`;
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function stableHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function parsePublishedAt(value: string): Date | null {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

function scoreImportance(input: {
  title: string;
  summaryShort: string;
  sourceKind: 'official' | 'market';
  publishedAt: Date;
  now: Date;
}): number {
  const text = `${input.title} ${input.summaryShort}`.toLowerCase();

  let score = input.sourceKind === 'official' ? 50 : 25;

  for (const keyword of IMPORTANT_KEYWORDS) {
    if (text.includes(keyword)) score += 10;
  }

  const ageHours = Math.max(
    0,
    (input.now.getTime() - input.publishedAt.getTime()) / (1000 * 60 * 60),
  );
  if (ageHours <= 6) score += 20;
  else if (ageHours <= 24) score += 10;

  return Math.min(score, 100);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    });
}

function normalizeHeadline(title: string): string {
  const cleaned = cleanText(title);
  const parts = cleaned.split(/\s[-–—]\s/);
  if (parts.length >= 2) {
    const sourceTail = extractSourceTail(cleaned);
    if (sourceTail) {
      return parts.slice(0, -1).join(' - ').trim() || cleaned;
    }
  }
  return cleaned;
}

function extractSourceTail(title: string): string | null {
  const parts = title.split(/\s[-–—]\s/);
  if (parts.length < 2) return null;
  const tail = (parts.at(-1) ?? '').trim();
  if (!tail) return null;
  if (tail.length <= 40) return tail;
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
