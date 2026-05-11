import { describe, expect, it } from 'vitest';

import { formatNumber, formatPercent, formatTRY, formatTRYDecimal } from '../formatters';

describe('formatTRY', () => {
  it('yuvarlanmış TL döner', () => {
    expect(formatTRY(1234)).toBe('₺1.234');
  });
  it('ondalıkları kırpar', () => {
    expect(formatTRY(1234.56)).toBe('₺1.235');
  });
  it('0 için ₺0 döner', () => {
    expect(formatTRY(0)).toBe('₺0');
  });
});

describe('formatTRYDecimal', () => {
  it('2 ondalıkla TL döner', () => {
    expect(formatTRYDecimal(1234.5)).toBe('₺1.234,50');
  });
});

describe('formatNumber', () => {
  it('Türkçe ayraç kullanır', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
});

describe('formatPercent', () => {
  it('0.32 → %32', () => {
    expect(formatPercent(0.32)).toBe('%32');
  });
});
