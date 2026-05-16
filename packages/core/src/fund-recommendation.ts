export type RiskProfile = 'VERY_LOW' | 'LOW' | 'BALANCED' | 'HIGH' | 'VERY_HIGH';

export interface FundRecommendationInput {
  riskProfile: RiskProfile;
  targetYears: number;
}

export interface FundRecommendation {
  id: string;
  name: string;
  summary: string;
  riskBand: RiskProfile;
  horizonBand: 'SHORT' | 'MEDIUM' | 'LONG';
  expectedReturnBand: string;
  whyFits: string;
  score: number;
}

interface FundTemplate {
  id: string;
  name: string;
  summary: string;
  riskBand: RiskProfile;
  horizonBand: 'SHORT' | 'MEDIUM' | 'LONG';
  expectedReturnBand: string;
}

const RISK_RANK: Record<RiskProfile, number> = {
  VERY_LOW: 1,
  LOW: 2,
  BALANCED: 3,
  HIGH: 4,
  VERY_HIGH: 5,
};

const FUND_TEMPLATES: FundTemplate[] = [
  {
    id: 'cash-plus',
    name: 'Likit Koruma Fonu',
    summary: 'Düşük dalgalanma, kısa vadede birikimi koruma odaklı.',
    riskBand: 'VERY_LOW',
    horizonBand: 'SHORT',
    expectedReturnBand: '%7-%11',
  },
  {
    id: 'short-bond',
    name: 'Kısa Vadeli Borçlanma Fonu',
    summary: 'Sabit getirili enstrüman ağırlığıyla istikrarlı ilerleme.',
    riskBand: 'LOW',
    horizonBand: 'SHORT',
    expectedReturnBand: '%10-%15',
  },
  {
    id: 'balanced-mix',
    name: 'Dengeli Karma Fon',
    summary: 'Hisse ve borçlanma dengesini birlikte taşır.',
    riskBand: 'BALANCED',
    horizonBand: 'MEDIUM',
    expectedReturnBand: '%14-%22',
  },
  {
    id: 'gold-mix',
    name: 'Altın ve Emtia Dengeli Fon',
    summary: 'Enflasyon dönemlerinde dengeleyici emtia katkısı hedefler.',
    riskBand: 'BALANCED',
    horizonBand: 'MEDIUM',
    expectedReturnBand: '%13-%21',
  },
  {
    id: 'growth-mix',
    name: 'Büyüme Odaklı Karma Fon',
    summary: 'Uzun vadede daha yüksek getiri için daha fazla dalgalanma alır.',
    riskBand: 'HIGH',
    horizonBand: 'LONG',
    expectedReturnBand: '%18-%29',
  },
  {
    id: 'equity-heavy',
    name: 'Hisse Yoğun Fon',
    summary: 'Uzun vadeli büyümeyi hedefleyen yüksek riskli dağılım.',
    riskBand: 'VERY_HIGH',
    horizonBand: 'LONG',
    expectedReturnBand: '%22-%35',
  },
];

function horizonFromYears(targetYears: number): 'SHORT' | 'MEDIUM' | 'LONG' {
  if (targetYears <= 3) return 'SHORT';
  if (targetYears <= 8) return 'MEDIUM';
  return 'LONG';
}

function buildWhyFits(riskProfile: RiskProfile, targetYears: number, fund: FundTemplate): string {
  const horizon = horizonFromYears(targetYears);
  const riskNote =
    riskProfile === fund.riskBand
      ? 'risk tercihinle doğrudan uyumlu'
      : 'risk tercihinle yakın seviyede';
  const horizonNote =
    horizon === fund.horizonBand
      ? 'hedef sürenle dengeli'
      : `hedef süren (${targetYears} yıl) için alternatif bir dağılım sunuyor`;
  return `${riskNote}; ${horizonNote}.`;
}

function calculateScore(input: FundRecommendationInput, fund: FundTemplate): number {
  const targetHorizon = horizonFromYears(input.targetYears);
  const riskGap = Math.abs(RISK_RANK[input.riskProfile] - RISK_RANK[fund.riskBand]);
  const horizonGap = targetHorizon === fund.horizonBand ? 0 : 1;
  const riskScore = Math.max(0, 75 - riskGap * 18);
  const horizonScore = horizonGap === 0 ? 25 : 10;
  return Math.max(0, Math.min(100, riskScore + horizonScore));
}

export function recommendFunds(input: FundRecommendationInput): FundRecommendation[] {
  const targetYears = Number.isFinite(input.targetYears)
    ? Math.max(1, Math.min(40, input.targetYears))
    : 10;

  return FUND_TEMPLATES.map((fund) => {
    const safeInput = { riskProfile: input.riskProfile, targetYears };
    return {
      ...fund,
      whyFits: buildWhyFits(input.riskProfile, targetYears, fund),
      score: calculateScore(safeInput, fund),
    };
  }).sort((a, b) => b.score - a.score);
}
