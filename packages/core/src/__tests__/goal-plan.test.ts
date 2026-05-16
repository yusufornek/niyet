import { describe, expect, it } from 'vitest';

import { buildGoalSavingsPlan, simulateGoalContribution } from '../goal-plan';

const now = new Date('2026-01-01T00:00:00.000Z');
const targetDate = new Date('2026-07-01T00:00:00.000Z');

describe('goal savings plan', () => {
  it('uses behavior capacity when opportunities are strong', () => {
    const plan = buildGoalSavingsPlan({
      targetPrice: 6000,
      currentAmount: 0,
      targetDate,
      monthlyIncome: 20000,
      last30dOpportunity: 5000,
      acceptedContributionsLast30d: 1000,
      now,
    });

    expect(plan.suggestedMonthlyContribution).toBeGreaterThan(2500);
    expect(plan.level).toBe('ON_TRACK');
  });

  it('marks risky goals when required contribution is above capacity', () => {
    const plan = buildGoalSavingsPlan({
      targetPrice: 60000,
      currentAmount: 0,
      targetDate,
      monthlyIncome: 8000,
      last30dOpportunity: 500,
      acceptedContributionsLast30d: 0,
      now,
    });

    expect(plan.monthlyGap).toBeGreaterThan(0);
    expect(plan.level).toBe('AT_RISK');
  });
});

describe('simulateGoalContribution', () => {
  it('hedef tamamlanmış (remaining=0) → ON_TRACK, projection=0', () => {
    const r = simulateGoalContribution({
      monthlyContribution: 1000,
      remainingAmount: 0,
      targetDate,
      now,
    });
    expect(r.projectedMonthsToGoal).toBe(0);
    expect(r.level).toBe('ON_TRACK');
    expect(r.monthsDelta).toBeLessThanOrEqual(0);
  });

  it('katkı 0 → projection null, AT_RISK', () => {
    const r = simulateGoalContribution({
      monthlyContribution: 0,
      remainingAmount: 10000,
      targetDate,
      now,
    });
    expect(r.projectedMonthsToGoal).toBeNull();
    expect(r.projectedEtaDate).toBeNull();
    expect(r.monthsDelta).toBeNull();
    expect(r.level).toBe('AT_RISK');
  });

  // targetDate (2026-07-01) - now (2026-01-01) ≈ 181 gün → monthsUntil = ceil(181/30) = 7 ay
  // Bu, mevcut monthsUntil davranışı (muhafazakar yuvarlama).

  it('aylık 1000₺, kalan 5000₺ → 5 ay (hedef tarihinden 2 ay erken) → ON_TRACK', () => {
    const r = simulateGoalContribution({
      monthlyContribution: 1000,
      remainingAmount: 5000,
      targetDate,
      now,
    });
    expect(r.projectedMonthsToGoal).toBe(5);
    expect(r.targetMonthsRemaining).toBe(7);
    expect(r.monthsDelta).toBe(-2);
    expect(r.level).toBe('ON_TRACK');
  });

  it('aylık 1000₺, kalan 7000₺ → 7 ay (tam zamanında) → ON_TRACK, delta=0', () => {
    const r = simulateGoalContribution({
      monthlyContribution: 1000,
      remainingAmount: 7000,
      targetDate,
      now,
    });
    expect(r.projectedMonthsToGoal).toBe(7);
    expect(r.monthsDelta).toBe(0);
    expect(r.level).toBe('ON_TRACK');
  });

  it('aylık 1000₺, kalan 8000₺ → 8 ay (1 ay geç, ≤%25 sapma) → STRETCH', () => {
    const r = simulateGoalContribution({
      monthlyContribution: 1000,
      remainingAmount: 8000,
      targetDate,
      now,
    });
    expect(r.projectedMonthsToGoal).toBe(8);
    expect(r.monthsDelta).toBe(1);
    expect(r.level).toBe('STRETCH');
  });

  it('aylık 1000₺, kalan 12000₺ → 12 ay (5 ay geç, %71 sapma) → AT_RISK', () => {
    const r = simulateGoalContribution({
      monthlyContribution: 1000,
      remainingAmount: 12000,
      targetDate,
      now,
    });
    expect(r.projectedMonthsToGoal).toBe(12);
    expect(r.monthsDelta).toBe(5);
    expect(r.level).toBe('AT_RISK');
  });

  it('negatif input clamp 0', () => {
    const r = simulateGoalContribution({
      monthlyContribution: -500,
      remainingAmount: -1000,
      targetDate,
      now,
    });
    expect(r.monthlyContribution).toBe(0);
    expect(r.projectedMonthsToGoal).toBe(0);
  });

  it('projectedEtaDate doğru ay sayısı kadar ileri', () => {
    const r = simulateGoalContribution({
      monthlyContribution: 2000,
      remainingAmount: 8000,
      targetDate,
      now,
    });
    expect(r.projectedMonthsToGoal).toBe(4);
    const expected = new Date(now);
    expected.setMonth(expected.getMonth() + 4);
    expect(r.projectedEtaDate?.getMonth()).toBe(expected.getMonth());
    expect(r.projectedEtaDate?.getFullYear()).toBe(expected.getFullYear());
  });
});
