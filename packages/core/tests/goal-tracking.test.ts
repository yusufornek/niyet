import { describe, expect, it } from 'vitest';
import {
  calculateMonthlySavingNeeded,
  calculatePriceChange,
  calculateProgress,
  calculateRemainingAmount,
  checkSignificantPriceChange,
  cleanRawQuery,
  fallbackNormalizeQuery,
  normalizeProductQuery,
  parsePrice
} from '../src/index.js';

describe('goal tracking core', () => {
  it('cleans Turkish intent phrases from raw product queries', () => {
    expect(cleanRawQuery('iPhone 15 almak için para biriktiriyorum!')).toBe('iPhone 15');
    expect(cleanRawQuery('Hedefim Samsung kulaklık almak istiyorum')).toBe('Samsung kulaklık');
  });

  it('applies fallback typo replacements and category hints', () => {
    const result = fallbackNormalizeQuery('ayfon 15 almak istiyorum');

    expect(result.normalizedQuery).toBe('iphone 15');
    expect(result.category).toBe('electronics');
    expect(result.source).toBe('fallback');
  });

  it('falls back when llm normalization is null', () => {
    const result = normalizeProductQuery('samsng tablet hedefim', null);

    expect(result.normalizedQuery).toBe('samsung tablet');
    expect(result.source).toBe('fallback');
  });

  it('parses common TRY, USD, and EUR price formats', () => {
    expect(parsePrice('₺45,999')).toEqual({ amount: 45999, currency: 'TRY' });
    expect(parsePrice('45.999 TL')).toEqual({ amount: 45999, currency: 'TRY' });
    expect(parsePrice('$1,299')).toEqual({ amount: 1299, currency: 'USD' });
    expect(parsePrice('€899')).toEqual({ amount: 899, currency: 'EUR' });
    expect(parsePrice('TRY 45,999.00')).toEqual({ amount: 45999, currency: 'TRY' });
  });

  it('calculates progress and remaining amount', () => {
    expect(calculateProgress(250, 1000)).toBe(0.25);
    expect(calculateProgress(1200, 1000)).toBe(1);
    expect(calculateRemainingAmount(250, 1000)).toBe(750);
  });

  it('calculates monthly saving need from target date', () => {
    const monthly = calculateMonthlySavingNeeded(
      900,
      new Date('2026-08-09T00:00:00.000Z'),
      new Date('2026-05-11T00:00:00.000Z')
    );

    expect(monthly).toBe(300);
  });

  it('checks significant price changes using the default threshold', () => {
    expect(calculatePriceChange(1000, 1060).percentageChange).toBe(0.06);
    expect(checkSignificantPriceChange(1000, 1049)).toBeNull();
    expect(checkSignificantPriceChange(1000, 950)?.direction).toBe('DECREASE');
  });
});
