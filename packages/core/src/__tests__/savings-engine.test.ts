import { describe, expect, it } from 'vitest';

import {
  annualProjection,
  categoryBreakdown,
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
