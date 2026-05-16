import { calculateMonthlySavingNeeded, roundMoney } from './goal-tracking';

export type GoalPlanLevel = 'ON_TRACK' | 'STRETCH' | 'AT_RISK';

export interface GoalSavingsPlanInput {
  targetPrice: number;
  currentAmount: number;
  targetDate: Date;
  monthlyIncome: number;
  last30dOpportunity: number;
  acceptedContributionsLast30d: number;
  now?: Date;
}

export interface GoalSavingsPlan {
  requiredMonthlyContribution: number;
  suggestedMonthlyContribution: number;
  monthlyGap: number;
  projectedMonthsToGoal: number;
  targetMonthsRemaining: number;
  level: GoalPlanLevel;
  summary: string;
}

export const MIN_GOAL_MONTHLY_CONTRIBUTION = 250;
export const MAX_INCOME_SHARE_FOR_GOAL = 0.2;
export const OPPORTUNITY_CAPTURE_RATE = 0.45;
export const ACCEPTED_CONTRIBUTION_WEIGHT = 0.65;

export function buildGoalSavingsPlan(input: GoalSavingsPlanInput): GoalSavingsPlan {
  const now = input.now ?? new Date();
  const remainingAmount = Math.max(input.targetPrice - input.currentAmount, 0);
  const requiredMonthlyContribution = calculateMonthlySavingNeeded(
    remainingAmount,
    input.targetDate,
    now,
  );

  const incomeCap = Math.max(
    MIN_GOAL_MONTHLY_CONTRIBUTION,
    input.monthlyIncome * MAX_INCOME_SHARE_FOR_GOAL,
  );
  const behaviorCapacity =
    input.last30dOpportunity * OPPORTUNITY_CAPTURE_RATE +
    input.acceptedContributionsLast30d * ACCEPTED_CONTRIBUTION_WEIGHT;
  const rawSuggested = Math.max(
    MIN_GOAL_MONTHLY_CONTRIBUTION,
    Math.min(incomeCap, behaviorCapacity || requiredMonthlyContribution * 0.75),
  );
  const suggestedMonthlyContribution = roundMoney(
    Math.min(
      Math.max(rawSuggested, requiredMonthlyContribution * 0.5),
      Math.max(incomeCap, requiredMonthlyContribution),
    ),
  );
  const monthlyGap = roundMoney(requiredMonthlyContribution - suggestedMonthlyContribution);
  const projectedMonthsToGoal =
    suggestedMonthlyContribution > 0
      ? Math.ceil(remainingAmount / suggestedMonthlyContribution)
      : Number.POSITIVE_INFINITY;
  const targetMonthsRemaining = monthsUntil(input.targetDate, now);
  const level = planLevel(monthlyGap, requiredMonthlyContribution);

  return {
    requiredMonthlyContribution: roundMoney(requiredMonthlyContribution),
    suggestedMonthlyContribution,
    monthlyGap,
    projectedMonthsToGoal,
    targetMonthsRemaining,
    level,
    summary: fallbackGoalPlanSummary({
      requiredMonthlyContribution,
      suggestedMonthlyContribution,
      monthlyGap,
      projectedMonthsToGoal,
      targetMonthsRemaining,
      level,
    }),
  };
}

export function fallbackGoalPlanSummary(plan: Omit<GoalSavingsPlan, 'summary'>): string {
  if (plan.level === 'ON_TRACK') {
    return `Bu hedef icin aylik ${Math.round(plan.suggestedMonthlyContribution)} TL katkı yeterli gorunuyor. Mevcut davranisina gore hedef tarihine yakin ilerleyebilirsin.`;
  }

  if (plan.level === 'STRETCH') {
    return `Hedef ulasilabilir ama aylik ${Math.round(plan.monthlyGap)} TL ek alan acmak gerekiyor. Tasarruf radarindaki firsatlari bu hedefe yonlendirmek plani guclendirir.`;
  }

  return `Bu hedef mevcut plana gore riskli. Aylik katkıyı artirmak, hedef tarihini esnetmek veya daha uygun fiyatli alternatifleri izlemek gerekir.`;
}

function planLevel(monthlyGap: number, requiredMonthlyContribution: number): GoalPlanLevel {
  if (requiredMonthlyContribution <= 0 || monthlyGap <= 0) {
    return 'ON_TRACK';
  }

  const gapRatio = monthlyGap / requiredMonthlyContribution;
  if (gapRatio <= 0.25) {
    return 'STRETCH';
  }

  return 'AT_RISK';
}

function monthsUntil(targetDate: Date, now: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const remainingDays = Math.max(
    Math.ceil((targetDate.getTime() - now.getTime()) / millisecondsPerDay),
    1,
  );
  return Math.max(Math.ceil(remainingDays / 30), 1);
}

// ─────────────────────────────────────────────────────────────
// Goal Contribution Simulator — interaktif "ne olur eğer" hesabı
// PBI: "aylık katkımı artırırsam veya azaltırsam ne zaman ulaşırım"
// ─────────────────────────────────────────────────────────────

export interface GoalContributionSimulation {
  /** Simüle edilen aylık katkı (girilen değer, echo) */
  monthlyContribution: number;
  /** Mevcut hızla projeksiyon ay sayısı. Katkı 0 ise null. */
  projectedMonthsToGoal: number | null;
  /** Projeksiyon tarihi (now + projectedMonthsToGoal ay). Null ise null. */
  projectedEtaDate: Date | null;
  /** Hedef tarihine kalan ay sayısı (hedef için referans) */
  targetMonthsRemaining: number;
  /**
   * Projeksiyon vs hedef arasındaki ay farkı.
   * - Pozitif: hedef tarihinden N ay geç ulaşır
   * - Negatif: hedef tarihinden |N| ay erken ulaşır
   * - 0: tam zamanında
   * - null: katkı 0, ulaşılmıyor
   */
  monthsDelta: number | null;
  /** Hedef tarihine yetişme seviyesi (UI badge için) */
  level: GoalPlanLevel;
}

/**
 * Pure simulator — slider'a/input'a göre anlık hesap.
 *
 * Backend `buildGoalSavingsPlan` "önerilen katkı" hesaplar (kullanıcı davranışı
 * + gelir kapasitesi); bu fonksiyon ise "verilen katkı ile ne olur" sorusuna
 * cevap verir. UI slider'ında her değişikte mikro-saniyede çalışır.
 *
 * Level karar mantığı:
 * - projected null veya target'tan çok büyük (>%25 sapma) → AT_RISK
 * - projected target'tan büyük ama az sapma → STRETCH
 * - projected ≤ target → ON_TRACK
 *
 * Edge cases:
 * - monthlyContribution ≤ 0: projected=null, monthsDelta=null, level=AT_RISK
 * - remainingAmount ≤ 0: projected=0, projectedEtaDate=now, level=ON_TRACK
 *   (hedef zaten tamamlanmış)
 * - targetDate geçmişte: targetMonthsRemaining=1 (monthsUntil clamp eder)
 */
export function simulateGoalContribution(input: {
  monthlyContribution: number;
  remainingAmount: number;
  targetDate: Date;
  now?: Date;
}): GoalContributionSimulation {
  const now = input.now ?? new Date();
  const monthlyContribution = Math.max(0, input.monthlyContribution);
  const remainingAmount = Math.max(0, input.remainingAmount);
  const targetMonthsRemaining = monthsUntil(input.targetDate, now);

  // Hedef zaten tamamlanmış
  if (remainingAmount === 0) {
    return {
      monthlyContribution: roundMoney(monthlyContribution),
      projectedMonthsToGoal: 0,
      projectedEtaDate: new Date(now),
      targetMonthsRemaining,
      monthsDelta: -targetMonthsRemaining,
      level: 'ON_TRACK',
    };
  }

  // Katkı yok → ulaşılamıyor
  if (monthlyContribution === 0) {
    return {
      monthlyContribution: 0,
      projectedMonthsToGoal: null,
      projectedEtaDate: null,
      targetMonthsRemaining,
      monthsDelta: null,
      level: 'AT_RISK',
    };
  }

  const projectedMonthsToGoal = Math.ceil(remainingAmount / monthlyContribution);
  const projectedEtaDate = new Date(now);
  projectedEtaDate.setMonth(projectedEtaDate.getMonth() + projectedMonthsToGoal);
  const monthsDelta = projectedMonthsToGoal - targetMonthsRemaining;

  let level: GoalPlanLevel;
  if (monthsDelta <= 0) {
    level = 'ON_TRACK';
  } else if (monthsDelta / Math.max(1, targetMonthsRemaining) <= 0.25) {
    // hedef tarihinden ≤%25 fazla → STRETCH (ulaşılabilir ama sıkı)
    level = 'STRETCH';
  } else {
    level = 'AT_RISK';
  }

  return {
    monthlyContribution: roundMoney(monthlyContribution),
    projectedMonthsToGoal,
    projectedEtaDate,
    targetMonthsRemaining,
    monthsDelta,
    level,
  };
}
