import { describe, expect, it } from 'vitest';

import {
  calculateMonthlySavingNeeded,
  checkSignificantPriceChange,
  normalizeProductQuery,
  parsePrice,
} from '../goal-tracking';

describe('goal-tracking helpers', () => {
  it('normalizes raw query with fallback when llm result is absent', () => {
    const normalized = normalizeProductQuery('ayfon 15 almak istiyorum');
    expect(normalized.normalizedQuery).toContain('iphone');
    expect(normalized.source).toBe('fallback');
  });

  it('parses common TRY format', () => {
    const parsed = parsePrice('45.999,90 TL');
    expect(parsed).toEqual({ amount: 45999.9, currency: 'TRY' });
  });

  it('detects significant increase above threshold', () => {
    const result = checkSignificantPriceChange(1000, 1100, 0.05);
    expect(result?.direction).toBe('INCREASE');
  });

  it('estimates monthly saving for target date', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const target = new Date('2026-07-01T00:00:00.000Z');
    const monthly = calculateMonthlySavingNeeded(6000, target, now);
    expect(monthly).toBeGreaterThan(900);
    expect(monthly).toBeLessThan(1200);
  });
});
