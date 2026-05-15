import { describe, expect, it } from 'vitest';

import { buildGoalSavingsPlan } from '../goal-plan';

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
