export interface TuikInflationRate {
  annualRate: number;
  monthlyRate: number | null;
  period: string;
  publishedAt: Date;
  source: string;
  sourceUrl: string;
}

interface TuikPressListItem {
  id: string;
  title: string;
}

interface TuikPressListResponse {
  data?: TuikPressListItem[];
  isError?: boolean;
}

interface TuikPressDetailResponse {
  data?: {
    id: number;
    date: string;
    title: string;
    period: string;
    content: string;
  };
  isError?: boolean;
}

const TUIK_BASE_URL = 'https://data.tuik.gov.tr';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

let cachedRate: { expiresAt: number; value: TuikInflationRate | null } | null = null;

export async function fetchLatestTuikInflationRate(
  fetcher: typeof fetch = fetch,
): Promise<TuikInflationRate | null> {
  const now = Date.now();
  if (cachedRate && cachedRate.expiresAt > now) return cachedRate.value;

  const value = await fetchLatestTuikInflationRateUncached(fetcher);
  cachedRate = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export function clearTuikInflationRateCache() {
  cachedRate = null;
}

async function fetchLatestTuikInflationRateUncached(
  fetcher: typeof fetch,
): Promise<TuikInflationRate | null> {
  const list = await fetchJson<TuikPressListResponse>(fetcher, `${TUIK_BASE_URL}/api/tr/press`);
  const cpiPress = list.data?.find((item) => item.title === 'Tüketici Fiyat Endeksi');
  if (!cpiPress) return null;

  const detail = await fetchJson<TuikPressDetailResponse>(
    fetcher,
    `${TUIK_BASE_URL}/api/tr/press/${cpiPress.id}`,
  );
  if (!detail.data) return null;

  const annualRate = parseAnnualCpiRate(detail.data.content);
  if (annualRate == null) return null;

  return {
    annualRate,
    monthlyRate: parseMonthlyCpiRate(detail.data.content),
    period: detail.data.period,
    publishedAt: new Date(detail.data.date),
    source: 'TÜİK',
    sourceUrl: `${TUIK_BASE_URL}/tr/press/${detail.data.id}`,
  };
}

async function fetchJson<T>(fetcher: typeof fetch, url: string): Promise<T> {
  const response = await fetcher(url, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!response.ok) {
    throw new Error(`TÜİK verisi alınamadı: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function parseAnnualCpiRate(content: string): number | null {
  return parseTurkishPercent(content, /yıllık\s*%([\d,.]+)/i);
}

export function parseMonthlyCpiRate(content: string): number | null {
  return parseTurkishPercent(content, /aylık\s*%([\d,.]+)/i);
}

function parseTurkishPercent(content: string, pattern: RegExp): number | null {
  const normalized = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const match = normalized.match(pattern);
  if (!match) return null;

  const rawValue = match[1];
  if (!rawValue) return null;

  const value = Number(rawValue.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}
