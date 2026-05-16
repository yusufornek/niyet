/**
 * Category Auto-Save core fn testleri.
 *
 * Edge case'leri özellikle çıkardık:
 * - Lookback'te hiç işlem yok (insufficient history)
 * - Bu ay ortalamadan yüksek (negative shortfall → trigger etme)
 * - Lookback'in bazı ayları sıfır
 * - Mikro-fark (1 TL altı) trigger etmemeli
 * - Mevsim sınırı (Aralık → Ocak) buildLookback'te düzgün geri gitmeli
 */
import { describe, it, expect } from 'vitest';

import {
  buildLookbackMonths,
  computeCategoryShortfall,
  getMonthRange,
  monthKey,
  sumCategoryForMonth,
} from './category-auto-save';

const COFFEE = 'COFFEE' as const;

function tx(amount: number, category: string, isoDate: string) {
  return {
    amount,
    category: category as any,
    occurredAt: new Date(isoDate),
  };
}

describe('monthKey', () => {
  it('UTC bazlı YYYY-MM döndürmeli', () => {
    expect(monthKey(new Date('2026-01-15T10:00:00Z'))).toBe('2026-01');
    expect(monthKey(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
  });
});

describe('buildLookbackMonths', () => {
  it('hedef ay HARİÇ N ay geriye gitmeli', () => {
    const ranges = buildLookbackMonths('2026-05', 3);
    expect(ranges.map((r) => r.monthYear)).toEqual(['2026-02', '2026-03', '2026-04']);
  });

  it('yıl sınırını aşmalı', () => {
    const ranges = buildLookbackMonths('2026-02', 3);
    expect(ranges.map((r) => r.monthYear)).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('lookback=0 boş döndürmeli', () => {
    expect(buildLookbackMonths('2026-05', 0)).toEqual([]);
  });

  it('start ve end UTC ay sınırlarında olmalı', () => {
    const ranges = buildLookbackMonths('2026-05', 1);
    const r = ranges[0]!;
    expect(r.monthYear).toBe('2026-04');
    expect(r.start.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('geçersiz formatta hata atmalı', () => {
    expect(() => buildLookbackMonths('2026', 3)).toThrow();
    expect(() => buildLookbackMonths('xxxx-yy', 3)).toThrow();
  });
});

describe('getMonthRange', () => {
  it('UTC ay [start, end) döndürmeli', () => {
    const r = getMonthRange('2026-05');
    expect(r.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('sumCategoryForMonth', () => {
  const txs = [
    tx(50, COFFEE, '2026-05-02T08:00:00Z'),
    tx(75, COFFEE, '2026-05-15T08:00:00Z'),
    tx(120, 'FOOD_DELIVERY', '2026-05-10T08:00:00Z'),
    tx(40, COFFEE, '2026-04-28T08:00:00Z'), // önceki ay
    tx(60, COFFEE, '2026-06-01T00:00:00Z'), // diğer ay (start=06-01 dahil değil)
  ];

  it('yalnız belirtilen kategori + ay topluyor olmalı', () => {
    const result = sumCategoryForMonth(txs, COFFEE, getMonthRange('2026-05'));
    expect(result).toEqual({ monthYear: '2026-05', amount: 125, txCount: 2 });
  });

  it('ay sınırı [inclusive, exclusive) çalışmalı', () => {
    // 2026-06-01T00:00:00Z hariç → 2026-05'in sayısına dahil DEĞİL
    const may = sumCategoryForMonth(txs, COFFEE, getMonthRange('2026-05'));
    const jun = sumCategoryForMonth(txs, COFFEE, getMonthRange('2026-06'));
    expect(may.txCount).toBe(2);
    expect(jun.txCount).toBe(1);
  });

  it('boş eşleşmede sıfır + count 0', () => {
    const r = sumCategoryForMonth([], COFFEE, getMonthRange('2026-05'));
    expect(r.amount).toBe(0);
    expect(r.txCount).toBe(0);
  });
});

describe('computeCategoryShortfall', () => {
  it('happy path: bu ay ortalamanın altında → shouldTrigger=true', () => {
    const txs = [
      // 3 aylık ortalama 150 TL
      tx(150, COFFEE, '2026-02-05T08:00:00Z'),
      tx(160, COFFEE, '2026-03-05T08:00:00Z'),
      tx(140, COFFEE, '2026-04-05T08:00:00Z'),
      // Mayıs'ta sadece 80 TL
      tx(80, COFFEE, '2026-05-10T08:00:00Z'),
    ];

    const result = computeCategoryShortfall({
      transactions: txs,
      category: COFFEE,
      monthYear: '2026-05',
      lookbackMonths: 3,
    });

    expect(result.currentAmount).toBe(80);
    expect(result.averageAmount).toBe(150);
    expect(result.shortfallAmount).toBe(70);
    expect(result.shortfallPct).toBeCloseTo(70 / 150, 4);
    expect(result.shouldTrigger).toBe(true);
    expect(result.hasSufficientHistory).toBe(true);
    expect(result.lookbackMonthsAnalyzed).toBe(3);
  });

  it('bu ay ortalama üzerinde → shouldTrigger=false', () => {
    const txs = [
      tx(50, COFFEE, '2026-02-05T08:00:00Z'),
      tx(50, COFFEE, '2026-03-05T08:00:00Z'),
      tx(50, COFFEE, '2026-04-05T08:00:00Z'),
      tx(200, COFFEE, '2026-05-10T08:00:00Z'),
    ];
    const result = computeCategoryShortfall({
      transactions: txs,
      category: COFFEE,
      monthYear: '2026-05',
      lookbackMonths: 3,
    });
    expect(result.averageAmount).toBe(50);
    expect(result.shortfallAmount).toBe(-150);
    expect(result.shouldTrigger).toBe(false);
  });

  it('lookback boş → insufficient history, shouldTrigger=false', () => {
    const txs = [tx(80, COFFEE, '2026-05-10T08:00:00Z')];
    const result = computeCategoryShortfall({
      transactions: txs,
      category: COFFEE,
      monthYear: '2026-05',
      lookbackMonths: 3,
    });
    expect(result.hasSufficientHistory).toBe(false);
    expect(result.averageAmount).toBeNull();
    expect(result.shortfallAmount).toBe(0);
    expect(result.shouldTrigger).toBe(false);
  });

  it('lookbackin 1 ayinda veri varsa yeterli history (digerleri sifir)', () => {
    const txs = [
      tx(90, COFFEE, '2026-03-05T08:00:00Z'),
      tx(0, COFFEE, '2026-04-05T08:00:00Z'), // amount=0 ama tx mevcut
      tx(20, COFFEE, '2026-05-10T08:00:00Z'),
    ];
    const result = computeCategoryShortfall({
      transactions: txs,
      category: COFFEE,
      monthYear: '2026-05',
      lookbackMonths: 3,
    });
    // Feb=0, Mar=90, Apr=0 → ortalama (0+90+0)/3 = 30
    expect(result.hasSufficientHistory).toBe(true);
    expect(result.averageAmount).toBe(30);
    expect(result.shortfallAmount).toBe(10);
    expect(result.shouldTrigger).toBe(true);
  });

  it('1 TL altı mikro-fark trigger etmemeli', () => {
    const txs = [
      tx(100, COFFEE, '2026-02-05T08:00:00Z'),
      tx(100, COFFEE, '2026-03-05T08:00:00Z'),
      tx(100, COFFEE, '2026-04-05T08:00:00Z'),
      tx(99.5, COFFEE, '2026-05-10T08:00:00Z'),
    ];
    const result = computeCategoryShortfall({
      transactions: txs,
      category: COFFEE,
      monthYear: '2026-05',
      lookbackMonths: 3,
    });
    expect(result.shortfallAmount).toBe(0.5);
    expect(result.shouldTrigger).toBe(false);
  });

  it('lookback=0 ise hesap yapılmaz', () => {
    const txs = [tx(80, COFFEE, '2026-05-10T08:00:00Z')];
    const result = computeCategoryShortfall({
      transactions: txs,
      category: COFFEE,
      monthYear: '2026-05',
      lookbackMonths: 0,
    });
    expect(result.lookbackMonthsAnalyzed).toBe(0);
    expect(result.hasSufficientHistory).toBe(false);
    expect(result.shouldTrigger).toBe(false);
  });

  it('diğer kategorinin işlemleri etkilememeli', () => {
    const txs = [
      tx(150, COFFEE, '2026-02-05T08:00:00Z'),
      tx(150, COFFEE, '2026-03-05T08:00:00Z'),
      tx(150, COFFEE, '2026-04-05T08:00:00Z'),
      tx(50, COFFEE, '2026-05-10T08:00:00Z'),
      // Bu kategori ile alakasız büyük tx
      tx(10000, 'BILLS', '2026-05-15T08:00:00Z'),
    ];
    const result = computeCategoryShortfall({
      transactions: txs,
      category: COFFEE,
      monthYear: '2026-05',
      lookbackMonths: 3,
    });
    expect(result.currentAmount).toBe(50);
    expect(result.averageAmount).toBe(150);
    expect(result.shouldTrigger).toBe(true);
  });
});
