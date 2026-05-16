import { describe, expect, it } from 'vitest';

import {
  annualProjection,
  categoryBreakdown,
  projectSavingsHorizon,
  totalMonthlyOpportunity,
  type Transaction,
} from '../savings-engine';

const sampleTxs: Transaction[] = [
  { amount: 100, category: 'COFFEE', occurredAt: new Date() },
  { amount: 150, category: 'COFFEE', occurredAt: new Date() },
  { amount: 300, category: 'FOOD_DELIVERY', occurredAt: new Date(), opportunity: 100 },
  { amount: 50, category: 'TRANSPORT', occurredAt: new Date() },
];

describe('categoryBreakdown', () => {
  it('kategori bazında toplar', () => {
    const result = categoryBreakdown(sampleTxs);
    const coffee = result.find((r) => r.category === 'COFFEE');
    expect(coffee?.totalSpent).toBe(250);
    expect(coffee?.txCount).toBe(2);
    expect(coffee?.averageAmount).toBe(125);
  });

  it('en yüksek harcamadan azalan sırayla döner', () => {
    const result = categoryBreakdown(sampleTxs);
    expect(result[0]?.category).toBe('FOOD_DELIVERY');
    expect(result[1]?.category).toBe('COFFEE');
    expect(result[2]?.category).toBe('TRANSPORT');
  });

  it('AI opportunity varsa onu kullanır, yoksa heuristic', () => {
    const result = categoryBreakdown(sampleTxs);
    const food = result.find((r) => r.category === 'FOOD_DELIVERY');
    expect(food?.estimatedReducible).toBe(100); // AI opportunity'den geldi

    const coffee = result.find((r) => r.category === 'COFFEE');
    // 250 * 0.3 (COFFEE heuristic) = 75
    expect(coffee?.estimatedReducible).toBe(75);
  });

  it('boş array için boş döner', () => {
    expect(categoryBreakdown([])).toEqual([]);
  });
});

describe('totalMonthlyOpportunity', () => {
  it('reducible kategorilerin toplam tasarrufunu döner', () => {
    const result = totalMonthlyOpportunity(sampleTxs);
    // COFFEE 75 + FOOD_DELIVERY 100 = 175 (TRANSPORT reducible değil)
    expect(result).toBe(175);
  });
});

describe('annualProjection', () => {
  it('enflasyon 0 ise aylık × 12', () => {
    expect(annualProjection(1000, 0)).toBe(12000);
  });

  it('enflasyon > 0 ise compound growth uygular', () => {
    const result = annualProjection(1000, 24); // %24 enflasyon
    expect(result).toBeGreaterThan(12000);
    expect(result).toBeLessThan(15000); // makul sınır
  });
});

describe('projectSavingsHorizon', () => {
  it('bugün 0 ise tüm projeksiyonlar 0', () => {
    const r = projectSavingsHorizon({ todayAmount: 0 });
    expect(r.todayAmount).toBe(0);
    expect(r.monthlyAmount).toBe(0);
    expect(r.yearlyAmount).toBe(0);
    expect(r.horizon.every((h) => h.totalAmount === 0)).toBe(true);
  });

  it('bugün 25 ₺ → ay 750 ₺ → yıl 9000 ₺', () => {
    const r = projectSavingsHorizon({ todayAmount: 25 });
    expect(r.todayAmount).toBe(25);
    expect(r.monthlyAmount).toBe(750);
    expect(r.yearlyAmount).toBe(9000);
  });

  it('default horizon: 5, 10, 30 yıl noktaları', () => {
    const r = projectSavingsHorizon({ todayAmount: 25 });
    expect(r.horizon.map((h) => h.years)).toEqual([5, 10, 30]);
  });

  it('%5 yıllık getiriyle 30 yıl compound: yatırılandan büyük', () => {
    const r = projectSavingsHorizon({ todayAmount: 25, annualReturnPct: 5 });
    const thirty = r.horizon.find((h) => h.years === 30)!;
    // 30 yıl × 12 ay × 750 ₺ = 270.000 ₺ yatırıldı
    expect(thirty.totalContributed).toBe(270_000);
    // %5 compound ile yaklaşık 624.000 ₺ olur (kabul edilen yuvarlama)
    expect(thirty.totalAmount).toBeGreaterThan(600_000);
    expect(thirty.totalAmount).toBeLessThan(650_000);
    expect(thirty.growth).toBe(thirty.totalAmount - thirty.totalContributed);
  });

  it('return %0 ise compound yok, totalAmount = totalContributed', () => {
    const r = projectSavingsHorizon({ todayAmount: 25, annualReturnPct: 0 });
    for (const h of r.horizon) {
      expect(h.totalAmount).toBe(h.totalContributed);
      expect(h.growth).toBe(0);
    }
  });

  it('özel horizonYears ile çağrılabilir', () => {
    const r = projectSavingsHorizon({ todayAmount: 10, horizonYears: [1, 20] });
    expect(r.horizon.map((h) => h.years)).toEqual([1, 20]);
  });

  it('negatif girdi 0 olarak kabul edilir', () => {
    const r = projectSavingsHorizon({ todayAmount: -50 });
    expect(r.todayAmount).toBe(0);
  });
});
