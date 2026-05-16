import { describe, expect, it } from 'vitest';

import {
  evaluateMonthlyContributionTarget,
  monthlyTargetMonthKey,
} from './monthly-contribution-target';

function c(amount: number, iso: string) {
  return { amount, createdAt: new Date(iso) };
}

describe('monthlyTargetMonthKey', () => {
  it('UTC YYYY-MM', () => {
    expect(monthlyTargetMonthKey(new Date('2026-05-15T10:00:00Z'))).toBe('2026-05');
    expect(monthlyTargetMonthKey(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
  });
});

describe('evaluateMonthlyContributionTarget', () => {
  it('BEHIND: katki esigin altinda', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(100, '2026-05-02T08:00:00Z'), c(200, '2026-05-10T08:00:00Z')],
      targetAmount: 1000,
      monthYear: '2026-05',
    });
    expect(r.contributedAmount).toBe(300);
    expect(r.remainingAmount).toBe(700);
    expect(r.utilizationPct).toBe(0.3);
    expect(r.level).toBe('BEHIND');
  });

  it('NEAR: utilization >= warnThresholdPct (%90 default) ama < %100', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(950, '2026-05-15T08:00:00Z')],
      targetAmount: 1000,
      monthYear: '2026-05',
    });
    expect(r.utilizationPct).toBe(0.95);
    expect(r.level).toBe('NEAR');
  });

  it('REACHED: tam %100', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(1000, '2026-05-15T08:00:00Z')],
      targetAmount: 1000,
      monthYear: '2026-05',
    });
    expect(r.utilizationPct).toBe(1);
    expect(r.level).toBe('REACHED');
    expect(r.remainingAmount).toBe(0);
  });

  it('REACHED: %100 ustu (super-saver)', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(1500, '2026-05-15T08:00:00Z')],
      targetAmount: 1000,
      monthYear: '2026-05',
    });
    expect(r.utilizationPct).toBe(1.5);
    expect(r.remainingAmount).toBe(-500);
    expect(r.level).toBe('REACHED');
  });

  it('ozel warnThresholdPct: %70', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(750, '2026-05-10T08:00:00Z')],
      targetAmount: 1000,
      monthYear: '2026-05',
      warnThresholdPct: 0.7,
    });
    expect(r.warnThresholdPct).toBe(0.7);
    expect(r.level).toBe('NEAR');
  });

  it('warnThresholdPct clamp [0,1]', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(500, '2026-05-10T08:00:00Z')],
      targetAmount: 1000,
      monthYear: '2026-05',
      warnThresholdPct: 1.5,
    });
    expect(r.warnThresholdPct).toBe(1);
  });

  it('target=0: BEHIND, utilization=0 (hata atmaz)', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(500, '2026-05-15T08:00:00Z')],
      targetAmount: 0,
      monthYear: '2026-05',
    });
    expect(r.level).toBe('BEHIND');
    expect(r.utilizationPct).toBe(0);
  });

  it('ay sinirinin disindaki katkilar sayilmaz', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [
        c(500, '2026-04-30T23:59:59Z'),
        c(500, '2026-05-01T00:00:00Z'),
        c(500, '2026-06-01T00:00:00Z'),
      ],
      targetAmount: 2000,
      monthYear: '2026-05',
    });
    expect(r.contributedAmount).toBe(500);
  });

  it('iade (REVERSED) negatif amount ile net etkili', () => {
    // Kullanici REVERSED contribution'lari pass etmemeli ama eger ediyorsa
    // negatif amount net etkili olur.
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(1000, '2026-05-05T08:00:00Z'), c(-200, '2026-05-10T08:00:00Z')],
      targetAmount: 1000,
      monthYear: '2026-05',
    });
    expect(r.contributedAmount).toBe(800);
    expect(r.level).toBe('BEHIND');
  });

  it('net negatif clamp 0', () => {
    const r = evaluateMonthlyContributionTarget({
      contributions: [c(100, '2026-05-05T08:00:00Z'), c(-500, '2026-05-10T08:00:00Z')],
      targetAmount: 1000,
      monthYear: '2026-05',
    });
    expect(r.contributedAmount).toBe(0);
    expect(r.level).toBe('BEHIND');
  });

  it('gecersiz monthYear hata atar', () => {
    expect(() =>
      evaluateMonthlyContributionTarget({
        contributions: [],
        targetAmount: 1000,
        monthYear: 'xxx',
      }),
    ).toThrow();
  });
});
