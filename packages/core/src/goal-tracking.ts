export const DEFAULT_PRICE_CHANGE_THRESHOLD = 0.05;

export type PriceAlertDirection = 'INCREASE' | 'DECREASE';
export type NormalizationSource = 'llm' | 'fallback';

export interface ProductQueryNormalization {
  rawQuery: string;
  normalizedQuery: string;
  category: string | null;
  confidence: number;
  source: NormalizationSource;
}

export interface ParsedPrice {
  amount: number;
  currency: 'TRY' | 'USD' | 'EUR';
}

export interface PriceChange {
  oldPrice: number;
  newPrice: number;
  absoluteChange: number;
  percentageChange: number;
  direction: PriceAlertDirection | 'UNCHANGED';
}

export interface SignificantPriceChange extends PriceChange {
  direction: PriceAlertDirection;
  isSignificant: true;
}

const INTENT_PHRASES = [
  /\b(almak istiyorum|almak istiyom|almak istiyorumdur)\b/gi,
  /\b(almak için|almak üzere|satın almak istiyorum)\b/gi,
  /\b(para biriktiriyorum|para biriktiriyom|para biriktirmek istiyorum)\b/gi,
  /\b(biriktiriyorum|birikim yapıyorum|birikim hedefi|hedefim)\b/gi,
  /\b(için para biriktiriyorum|için birikim yapıyorum)\b/gi,
  /\bpara\b/gi,
  /\b(en ucuz|fiyatı|fiyat|kaç para)\b/gi,
  /\b(bana|lütfen|acaba)\b/gi,
];

const TYPO_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bayfon\b/gi, 'iphone'],
  [/\biphon\b/gi, 'iphone'],
  [/\bipone\b/gi, 'iphone'],
  [/\bsamsng\b/gi, 'samsung'],
  [/\bsamsun\b/gi, 'samsung'],
  [/\bmacbok\b/gi, 'macbook'],
  [/\bmekbuk\b/gi, 'macbook'],
  [/\bbilgsyar\b/gi, 'bilgisayar'],
  [/\bbilgisyar\b/gi, 'bilgisayar'],
  [/\bkulaklk\b/gi, 'kulaklik'],
  [/\bkulaklik\b/gi, 'kulaklık'],
  [/\bsupurge\b/gi, 'süpürge'],
  [/\bairfryer\b/gi, 'air fryer'],
];

const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/\b(iphone|samsung|telefon|tablet|macbook|bilgisayar|laptop|kulaklık|kulaklik)\b/i, 'electronics'],
  [/\b(ayakkabı|ayakkabi|ceket|mont|elbise|pantolon|çanta|canta)\b/i, 'fashion'],
  [/\b(bisiklet|koşu bandı|kosu bandi|dambıl|dambil|spor)\b/i, 'sports'],
  [/\b(koltuk|masa|sandalye|yatak|dolap|lamba)\b/i, 'home'],
  [/\b(süpürge|supurge|air fryer|kahve makinesi|buzdolabı|buzdolabi)\b/i, 'appliance'],
];

export function cleanRawQuery(rawQuery: string): string {
  const withoutIntent = INTENT_PHRASES.reduce(
    (query, phrase) => query.replace(phrase, ' '),
    rawQuery,
  );

  return withoutIntent
    .normalize('NFKC')
    .replace(/[“”"']/g, ' ')
    .replace(/[!?.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fallbackNormalizeQuery(rawQuery: string): ProductQueryNormalization {
  const cleaned = cleanRawQuery(rawQuery);
  const normalizedQuery = TYPO_REPLACEMENTS.reduce(
    (query, [pattern, replacement]) => query.replace(pattern, replacement),
    cleaned,
  )
    .replace(/\s+/g, ' ')
    .trim();

  return {
    rawQuery,
    normalizedQuery: normalizedQuery || cleaned || rawQuery.trim(),
    category: inferCategory(normalizedQuery),
    confidence: normalizedQuery === cleaned ? 0.65 : 0.8,
    source: 'fallback',
  };
}

export function normalizeProductQuery(
  rawQuery: string,
  llmNormalization?: ProductQueryNormalization | null,
): ProductQueryNormalization {
  if (
    llmNormalization &&
    llmNormalization.normalizedQuery.trim().length > 0 &&
    llmNormalization.confidence >= 0 &&
    llmNormalization.confidence <= 1
  ) {
    return {
      ...llmNormalization,
      rawQuery,
      normalizedQuery: cleanRawQuery(llmNormalization.normalizedQuery),
      source: 'llm',
    };
  }

  return fallbackNormalizeQuery(rawQuery);
}

export function parsePrice(value: string | number | null | undefined): ParsedPrice | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? { amount: value, currency: 'TRY' } : null;
  }

  const currency = parseCurrency(value);
  const numericText = value.replace(/[^\d.,]/g, '').replace(/^[.,]+|[.,]+$/g, '');

  if (!numericText) {
    return null;
  }

  const normalizedNumber = normalizeNumberText(numericText);
  const amount = Number.parseFloat(normalizedNumber);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return { amount, currency };
}

export function calculateProgress(savedAmount: number, currentPrice: number): number {
  if (currentPrice <= 0) {
    return 0;
  }

  return Math.min(Math.max(savedAmount / currentPrice, 0), 1);
}

export function calculateRemainingAmount(savedAmount: number, currentPrice: number): number {
  return Math.max(currentPrice - savedAmount, 0);
}

export function calculatePriceChange(oldPrice: number, newPrice: number): PriceChange {
  const absoluteChange = newPrice - oldPrice;
  const percentageChange = oldPrice > 0 ? absoluteChange / oldPrice : 0;
  const direction = absoluteChange > 0 ? 'INCREASE' : absoluteChange < 0 ? 'DECREASE' : 'UNCHANGED';

  return {
    oldPrice,
    newPrice,
    absoluteChange,
    percentageChange,
    direction,
  };
}

export function calculateMonthlySavingNeeded(
  remainingAmount: number,
  targetDate: Date,
  now = new Date(),
): number {
  if (remainingAmount <= 0) {
    return 0;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const remainingDays = Math.max(Math.ceil((targetDate.getTime() - now.getTime()) / millisecondsPerDay), 1);
  const monthsRemaining = Math.max(remainingDays / 30, 1);

  return roundMoney(remainingAmount / monthsRemaining);
}

export function checkSignificantPriceChange(
  oldPrice: number,
  newPrice: number,
  threshold = DEFAULT_PRICE_CHANGE_THRESHOLD,
): SignificantPriceChange | null {
  const change = calculatePriceChange(oldPrice, newPrice);

  if (change.direction === 'UNCHANGED' || Math.abs(change.percentageChange) < threshold) {
    return null;
  }

  return {
    ...change,
    direction: change.direction,
    isSignificant: true,
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function inferCategory(query: string): string | null {
  const match = CATEGORY_HINTS.find(([pattern]) => pattern.test(query));
  return match?.[1] ?? null;
}

function parseCurrency(value: string): ParsedPrice['currency'] {
  if (/[€]|(?:\bEUR\b)/i.test(value)) {
    return 'EUR';
  }

  if (/[$]|(?:\bUSD\b)/i.test(value)) {
    return 'USD';
  }

  return 'TRY';
}

function normalizeNumberText(value: string): string {
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      return value.replace(/\./g, '').replace(',', '.');
    }

    return value.replace(/,/g, '');
  }

  if (lastComma >= 0) {
    const commaParts = value.split(',');
    if (commaParts.at(-1)?.length === 2) {
      return value.replace(/\./g, '').replace(',', '.');
    }
    return value.replace(/,/g, '');
  }

  if (lastDot >= 0) {
    const dotParts = value.split('.');
    if (dotParts.at(-1)?.length === 2) {
      return value.replace(/,/g, '');
    }
    return value.replace(/\./g, '');
  }

  return value;
}
