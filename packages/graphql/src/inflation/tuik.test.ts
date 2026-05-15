import { describe, expect, it } from 'vitest';

import { parseAnnualCpiRate, parseMonthlyCpiRate } from './tuik';

describe('TÜİK inflation parser', () => {
  it('extracts annual and monthly CPI rates from the press content', () => {
    const content = `
      <span><strong>Tüketici fiyat endeksi (TÜFE) yıllık %32,37 arttı, aylık %4,18 arttı</strong></span>
    `;

    expect(parseAnnualCpiRate(content)).toBe(32.37);
    expect(parseMonthlyCpiRate(content)).toBe(4.18);
  });
});
