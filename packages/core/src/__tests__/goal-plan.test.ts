import { describe, expect, it } from 'vitest';

import { buildGoalSavingsPlan, calculateGoalAcceleration } from '../goal-plan';

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
