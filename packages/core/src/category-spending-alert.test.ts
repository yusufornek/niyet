import { describe, expect, it } from 'vitest';

import { evaluateCategoryThreshold, spendingAlertMonthKey } from './category-spending-alert';

const COFFEE = 'COFFEE' as const;

function tx(amount: number, category: string, iso: string) {
  return { amount, category: category as any, occurredAt: new Date(iso) };
}

describe('spendingAlertMonthKey', () => {
  it('UTC YYYY-MM', () => {
    expect(spendingAlertMonthKey(new Date('2026-05-15T10:00:00Z'))).toBe('2026-05');
  });
});

describe('evaluateCategoryThreshold', () => {
  it('BELOW: harcama eşiğin altında', () => {
    const r = evaluateCategoryThreshold({
      transactions: [
        tx(100, COFFEE, '2026-05-02T08:00:00Z'),
        tx(200, COFFEE, '2026-05-10T08:00:00Z'),
      ],
      category: COFFEE,
      monthlyLimit: 1000,
      monthYear: '2026-05',
    });
    expect(r.spentAmount).toBe(300);
    expect(r.remainingAmount).toBe(700);
    expect(r.utilizationPct).toBe(0.3);
    expect(r.level).toBe('BELOW');
  });

  it('WARNING: harcama %80 ile %100 arasında', () => {
    const r = evaluateCategoryThreshold({
      transactions: [tx(850, COFFEE, '2026-05-15T08:00:00Z')],
      category: COFFEE,
      monthlyLimit: 1000,
      monthYear: '2026-05',
    });
    expect(r.utilizationPct).toBe(0.85);
    expect(r.level).toBe('WARNING');
  });

  it('OVER: harcama %100 üzeri', () => {
    const r = evaluateCategoryThreshold({
      transactions: [tx(1200, COFFEE, '2026-05-15T08:00:00Z')],
      category: COFFEE,
      monthlyLimit: 1000,
      monthYear: '2026-05',
    });
    expect(r.utilizationPct).toBe(1.2);
    expect(r.remainingAmount).toBe(-200);
    expect(r.level).toBe('OVER');
  });

  it('tam %100: OVER (kullanıcı limit boşaltıldığını bilmek ister)', () => {
    const r = evaluateCategoryThreshold({
      transactions: [tx(1000, COFFEE, '2026-05-15T08:00:00Z')],
      category: COFFEE,
      monthlyLimit: 1000,
      monthYear: '2026-05',
    });
    expect(r.utilizationPct).toBe(1);
    expect(r.level).toBe('OVER');
  });

  it('özel warnThresholdPct: %60 → 600₺ üzerinde WARNING', () => {
    const r = evaluateCategoryThreshold({
      transactions: [tx(700, COFFEE, '2026-05-15T08:00:00Z')],
      category: COFFEE,
      monthlyLimit: 1000,
      monthYear: '2026-05',
      warnThresholdPct: 0.6,
    });
    expect(r.warnThresholdPct).toBe(0.6);
    expect(r.level).toBe('WARNING');
  });

  it('warnThresholdPct clamp [0,1]', () => {
    const r = evaluateCategoryThreshold({
      transactions: [tx(500, COFFEE, '2026-05-15T08:00:00Z')],
      category: COFFEE,
      monthlyLimit: 1000,
      monthYear: '2026-05',
      warnThresholdPct: 1.5,
    });
    expect(r.warnThresholdPct).toBe(1);
  });

  it('limit=0: anlamsız ama hata atmaz, BELOW', () => {
    const r = evaluateCategoryThreshold({
      transactions: [tx(500, COFFEE, '2026-05-15T08:00:00Z')],
      category: COFFEE,
      monthlyLimit: 0,
      monthYear: '2026-05',
    });
    expect(r.level).toBe('BELOW');
    expect(r.utilizationPct).toBe(0);
  });

  it('diğer kategori işlemleri sayılmaz', () => {
    const r = evaluateCategoryThreshold({
      transactions: [
        tx(500, COFFEE, '2026-05-10T08:00:00Z'),
        tx(5000, 'BILLS', '2026-05-15T08:00:00Z'),
      ],
      category: COFFEE,
      monthlyLimit: 1000,
      monthYear: '2026-05',
    });
    expect(r.spentAmount).toBe(500);
  });

  it('ay sınırı [inclusive, exclusive)', () => {
    const r = evaluateCategoryThreshold({
      transactions: [
        tx(500, COFFEE, '2026-04-30T23:59:59Z'),
        tx(500, COFFEE, '2026-05-01T00:00:00Z'),
        tx(500, COFFEE, '2026-06-01T00:00:00Z'),
      ],
      category: COFFEE,
      monthlyLimit: 2000,
      monthYear: '2026-05',
    });
    expect(r.spentAmount).toBe(500);
  });

  it('iade (negatif amount) net etkili', () => {
    const r = evaluateCategoryThreshold({
      transactions: [
        tx(1000, COFFEE, '2026-05-05T08:00:00Z'),
        tx(-200, COFFEE, '2026-05-10T08:00:00Z'),
      ],
      category: COFFEE,
      monthlyLimit: 1000,
      monthYear: '2026-05',
    });
    expect(r.spentAmount).toBe(800);
    expect(r.level).toBe('WARNING');
  });

  it('geçersiz monthYear hata atar', () => {
    expect(() =>
      evaluateCategoryThreshold({
        transactions: [],
        category: COFFEE,
        monthlyLimit: 1000,
        monthYear: 'xxx',
      }),
    ).toThrow();
  });
});
