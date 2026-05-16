import { describe, expect, it } from 'vitest';

import {
  buildGoalSavingsPlan,
  calculateGoalAcceleration,
  simulateGoalContribution,
} from '../goal-plan';

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

describe('calculateGoalAcceleration', () => {
  it('remainingAmount 0 ise tüm ETA değerleri 0', () => {
    const r = calculateGoalAcceleration({
      remainingAmount: 0,
      currentMonthlyContribution: 500,
      categoryOpportunities: [{ category: 'COFFEE', monthlyOpportunity: 1000 }],
    });
    expect(r.currentEtaMonths).toBe(0);
    expect(r.categoryOptions[0]?.newEtaMonths).toBe(0);
    expect(r.categoryOptions[0]?.monthsShaved).toBe(0);
  });

  it('aylık katkı 0 ve kategori fırsatı varsa: önceki ETA Infinity, yeni ETA finite', () => {
    const r = calculateGoalAcceleration({
      remainingAmount: 10000,
      currentMonthlyContribution: 0,
      categoryOpportunities: [{ category: 'COFFEE', monthlyOpportunity: 1000 }],
    });
    expect(r.currentEtaMonths).toBe(Number.POSITIVE_INFINITY);
    expect(r.categoryOptions[0]?.newEtaMonths).toBe(Math.ceil(10000 / (1000 * 0.7))); // 700 ₺/ay → 15 ay
    expect(r.categoryOptions[0]?.monthsShaved).toBe(Number.POSITIVE_INFINITY);
  });

  it('basit senaryo: 18 ay ETA, kahveden 1000₺/ay kes → ETA azalır', () => {
    // remaining 18000, monthly 1000 → 18 ay; cutRatio 0.7 default → 700₺ ek
    const r = calculateGoalAcceleration({
      remainingAmount: 18000,
      currentMonthlyContribution: 1000,
      categoryOpportunities: [{ category: 'COFFEE', monthlyOpportunity: 1000 }],
    });
    expect(r.currentEtaMonths).toBe(18);
    // 1000 + 700 = 1700, 18000/1700 = 10.58 → ceil 11
    expect(r.categoryOptions[0]?.newEtaMonths).toBe(11);
    expect(r.categoryOptions[0]?.monthsShaved).toBe(7);
  });

  it('opportunity 0 olan kategoriler filtrelenir, max 5 döner', () => {
    const cats: Array<{
      category:
        | 'COFFEE'
        | 'FOOD_DELIVERY'
        | 'CLOTHING'
        | 'TRANSPORT'
        | 'BILLS'
        | 'OTHER'
        | 'MARKET';
      monthlyOpportunity: number;
    }> = [
      { category: 'COFFEE', monthlyOpportunity: 1000 },
      { category: 'FOOD_DELIVERY', monthlyOpportunity: 800 },
      { category: 'CLOTHING', monthlyOpportunity: 500 },
      { category: 'TRANSPORT', monthlyOpportunity: 0 },
      { category: 'BILLS', monthlyOpportunity: 0 },
      { category: 'OTHER', monthlyOpportunity: 200 },
      { category: 'MARKET', monthlyOpportunity: 100 },
    ];
    const r = calculateGoalAcceleration({
      remainingAmount: 20000,
      currentMonthlyContribution: 500,
      categoryOpportunities: cats,
    });
    expect(r.categoryOptions.length).toBe(5);
    expect(r.categoryOptions[0]?.category).toBe('COFFEE'); // azalan opportunity
    expect(r.categoryOptions[4]?.category).toBe('MARKET');
    expect(r.categoryOptions.every((o) => o.monthlyOpportunity > 0)).toBe(true);
  });

  it('topThreeCombined: top 3 kategorinin toplamı tek tek toplamından eşit veya daha fazla shave', () => {
    const r = calculateGoalAcceleration({
      remainingAmount: 30000,
      currentMonthlyContribution: 1000,
      categoryOpportunities: [
        { category: 'COFFEE', monthlyOpportunity: 1000 },
        { category: 'FOOD_DELIVERY', monthlyOpportunity: 800 },
        { category: 'CLOTHING', monthlyOpportunity: 500 },
      ],
    });
    expect(r.topThreeCombined.categories).toEqual(['COFFEE', 'FOOD_DELIVERY', 'CLOTHING']);
    // toplam kesim = (1000+800+500) × 0.7 = 1610
    expect(r.topThreeCombined.totalMonthlyCut).toBeCloseTo(1610, 0);
    // 30000 / (1000+1610) = 11.49 → ceil 12
    expect(r.topThreeCombined.newEtaMonths).toBe(12);
    // 30 - 12 = 18 ay shave (currentEta 30, çünkü 30000/1000)
    expect(r.currentEtaMonths).toBe(30);
    expect(r.topThreeCombined.monthsShaved).toBe(18);
    // Top 3 combined shave > en yüksek tek kategori shave
    expect(r.topThreeCombined.monthsShaved).toBeGreaterThanOrEqual(
      r.categoryOptions[0]!.monthsShaved as number,
    );
  });

  it('easiestSingle en yüksek opportunity kategorisidir', () => {
    const r = calculateGoalAcceleration({
      remainingAmount: 20000,
      currentMonthlyContribution: 1000,
      categoryOpportunities: [
        { category: 'COFFEE', monthlyOpportunity: 500 },
        { category: 'FOOD_DELIVERY', monthlyOpportunity: 1200 },
      ],
    });
    expect(r.easiestSingle?.category).toBe('FOOD_DELIVERY');
  });

  it('boş kategori listesi: option dizisi boş, topThree boş, easiestSingle null', () => {
    const r = calculateGoalAcceleration({
      remainingAmount: 10000,
      currentMonthlyContribution: 500,
      categoryOpportunities: [],
    });
    expect(r.categoryOptions).toEqual([]);
    expect(r.topThreeCombined.categories).toEqual([]);
    expect(r.topThreeCombined.totalMonthlyCut).toBe(0);
    expect(r.easiestSingle).toBeNull();
  });

  it('cutRatio özelleştirilebilir (1.0 = tüm fırsat kesilir)', () => {
    const r = calculateGoalAcceleration({
      remainingAmount: 18000,
      currentMonthlyContribution: 1000,
      categoryOpportunities: [{ category: 'COFFEE', monthlyOpportunity: 1000 }],
      cutRatio: 1.0,
    });
    // 1000 ek → toplam 2000/ay → 18000/2000 = 9 ay
    expect(r.categoryOptions[0]?.reasonableMonthlyCut).toBe(1000);
    expect(r.categoryOptions[0]?.newEtaMonths).toBe(9);
  });

  it('cutRatio range dışı (1.5) clamp 1.0', () => {
    const r = calculateGoalAcceleration({
      remainingAmount: 10000,
      currentMonthlyContribution: 500,
      categoryOpportunities: [{ category: 'COFFEE', monthlyOpportunity: 1000 }],
      cutRatio: 1.5,
    });
    expect(r.categoryOptions[0]?.reasonableMonthlyCut).toBe(1000); // clamp 1.0
  });
});
