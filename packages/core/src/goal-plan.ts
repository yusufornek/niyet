import { calculateMonthlySavingNeeded, roundMoney } from './goal-tracking';
import type { SpendingCategory } from './types';

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
// Goal Acceleration — kategori kesimi → ETA shave hesabı
// PBI: "hangi kategorilerde tasarruf yaparak hedefime yaklaşabileceğimi"
// ─────────────────────────────────────────────────────────────

/** Bir kategori için "şu kadar kesersen hedef şu kadar erken" senaryosu */
export interface CategoryAccelerationOption {
  category: SpendingCategory;
  /** Bu kategoride aylık tasarruf fırsatı (TL) — son 30 gün opportunity toplamı */
  monthlyOpportunity: number;
  /** Pratik olarak kesilebilir tutar (opportunity × cutRatio) */
  reasonableMonthlyCut: number;
  /** Bu kesim eklenince yeni ETA (ay). Hedef erişilemezse Infinity. */
  newEtaMonths: number;
  /** Mevcut ETA'dan kaç ay erken (ay). Infinity ya da 0 olabilir. */
  monthsShaved: number;
}

export interface CombinedAccelerationScenario {
  /** Senaryoyu oluşturan kategoriler */
  categories: SpendingCategory[];
  /** Toplam ek aylık kesim */
  totalMonthlyCut: number;
  /** Yeni ETA (ay) */
  newEtaMonths: number;
  /** Mevcut ETA'dan kaç ay erken */
  monthsShaved: number;
}

export interface GoalAccelerationPlan {
  /** Mevcut katkı oranıyla ETA (ay). Katkı 0 ise Infinity. */
  currentEtaMonths: number;
  /** Mevcut aylık katkı (girilen değer, kontrol kolaylığı için echo) */
  currentMonthlyContribution: number;
  /** Kalan tutar (girilen, echo) */
  remainingAmount: number;
  /** Kategori-bazlı seçenekler — opportunity'ye göre azalan sırada (max 5) */
  categoryOptions: CategoryAccelerationOption[];
  /** Top 3 kategoriyi birleşik kesme senaryosu */
  topThreeCombined: CombinedAccelerationScenario;
  /** En kolay (en yüksek opportunity'li tek kategori) senaryosu */
  easiestSingle: CategoryAccelerationOption | null;
}

export const DEFAULT_CATEGORY_CUT_RATIO = 0.7;

/**
 * Pure function — bir hedefin kategori kesimleriyle ne kadar hızlanacağını hesapla.
 *
 * AI Coach `simulate_goal_acceleration` tool'undan çağrılır. UI agnostic, DB
 * agnostic; sadece sayılar alır, sayılar döner.
 *
 * Strateji:
 * - `cutRatio` (default 0.7): bir kategorideki fırsatın gerçekten kesilebilen
 *   yüzdesi. %100 kesmek pratik değil ("kahveden hiç içme" gerçekçi değil).
 * - ETA = remainingAmount / monthlyContribution (yuvarlanır up).
 * - Yeni ETA = remainingAmount / (monthlyContribution + extraReduction).
 * - `topThreeCombined`: en yüksek opportunity'li 3 kategorinin reasonableCut
 *   toplamı kesilirse senaryosu.
 * - `easiestSingle`: tek kategoride en yüksek shave (genelde top opportunity).
 *
 * Edge cases:
 * - remainingAmount <= 0: ETA = 0, tüm shave = 0.
 * - currentMonthlyContribution <= 0: currentEta = Infinity; kesim varsa
 *   monthsShaved = Infinity (UI "Şu an hiç biriktirmiyorsun" mesajı verir).
 * - Kategori opportunity = 0: option çıkarılmaz (boş array dönebilir).
 */
export function calculateGoalAcceleration(input: {
  remainingAmount: number;
  currentMonthlyContribution: number;
  categoryOpportunities: Array<{ category: SpendingCategory; monthlyOpportunity: number }>;
  cutRatio?: number;
}): GoalAccelerationPlan {
  const remainingAmount = Math.max(0, input.remainingAmount);
  const currentMonthlyContribution = Math.max(0, input.currentMonthlyContribution);
  const cutRatio = clamp01(input.cutRatio ?? DEFAULT_CATEGORY_CUT_RATIO);

  const currentEtaMonths = etaMonths(remainingAmount, currentMonthlyContribution);

  // Filtrele: pozitif opportunity olanlar, sırala azalan, top 5 al
  const categoryOptions: CategoryAccelerationOption[] = input.categoryOpportunities
    .filter((c) => c.monthlyOpportunity > 0)
    .sort((a, b) => b.monthlyOpportunity - a.monthlyOpportunity)
    .slice(0, 5)
    .map((c) => {
      const reasonableMonthlyCut = roundMoney(c.monthlyOpportunity * cutRatio);
      const newEta = etaMonths(remainingAmount, currentMonthlyContribution + reasonableMonthlyCut);
      const shaved = monthsShavedBetween(currentEtaMonths, newEta);
      return {
        category: c.category,
        monthlyOpportunity: roundMoney(c.monthlyOpportunity),
        reasonableMonthlyCut,
        newEtaMonths: newEta,
        monthsShaved: shaved,
      };
    });

  const topThree = categoryOptions.slice(0, 3);
  const totalTopCut = topThree.reduce((s, o) => s + o.reasonableMonthlyCut, 0);
  const topThreeNewEta = etaMonths(remainingAmount, currentMonthlyContribution + totalTopCut);
  const topThreeCombined: CombinedAccelerationScenario = {
    categories: topThree.map((o) => o.category),
    totalMonthlyCut: roundMoney(totalTopCut),
    newEtaMonths: topThreeNewEta,
    monthsShaved: monthsShavedBetween(currentEtaMonths, topThreeNewEta),
  };

  const easiestSingle = categoryOptions[0] ?? null;

  return {
    currentEtaMonths,
    currentMonthlyContribution: roundMoney(currentMonthlyContribution),
    remainingAmount: roundMoney(remainingAmount),
    categoryOptions,
    topThreeCombined,
    easiestSingle,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CATEGORY_CUT_RATIO;
  return Math.max(0, Math.min(1, value));
}

function etaMonths(remaining: number, monthlyContribution: number): number {
  if (remaining <= 0) return 0;
  if (monthlyContribution <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(remaining / monthlyContribution);
}

function monthsShavedBetween(beforeEta: number, afterEta: number): number {
  if (!Number.isFinite(beforeEta) && Number.isFinite(afterEta)) {
    // "hedefe hiç ulaşılmıyorken" → "X ayda ulaşır" pratik anlam: Infinity shave
    return Number.POSITIVE_INFINITY;
  }
  if (!Number.isFinite(beforeEta) || !Number.isFinite(afterEta)) return 0;
  return Math.max(0, beforeEta - afterEta);
}
