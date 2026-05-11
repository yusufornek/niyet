/**
 * Future Score motoru — kullanıcının davranışsal finans disiplini puanı.
 *
 * 4 alt skor (0-100):
 * - contribution: düzenli katkı yapma sıklığı
 * - discipline: gereksiz harcamayı azaltma performansı
 * - consistency: hedefe bağlı kalma süresi
 * - social: birikim çemberlerine katılım
 *
 * Toplam skor = ağırlıklı ortalama (40-30-20-10).
 */

export interface FutureScoreInput {
  /** Son 4 haftada yapılan mikro katkı sayısı */
  recentContributionCount: number;
  /** Düzenli katkı kuralı sayısı */
  activeRulesCount: number;
  /** Bu ay azaltılabilir kategorilerde harcamanın geçen aya göre değişimi (-1 ile 1) */
  reducibleSpendingChange: number;
  /** Aktif goal sayısı */
  activeGoalsCount: number;
  /** Goal'a katkı yapılan ay sayısı */
  consecutiveContributionMonths: number;
  /** Üye olunan circle sayısı */
  circleMembershipCount: number;
}

export interface FutureScoreOutput {
  score: number;
  contribution: number;
  discipline: number;
  consistency: number;
  social: number;
}

const WEIGHTS = {
  contribution: 0.4,
  discipline: 0.3,
  consistency: 0.2,
  social: 0.1,
} as const;

/** 0-100 aralığına sıkıştır */
const clamp = (n: number): number => Math.max(0, Math.min(100, n));

export function computeFutureScore(input: FutureScoreInput): FutureScoreOutput {
  // Contribution: 4 hafta x ortalama 1 katkı = 100; aktif rule bonus
  const contribution = clamp(
    (input.recentContributionCount / 4) * 80 + input.activeRulesCount * 10,
  );

  // Discipline: azaltılabilir harcama düşüşü iyi
  // reducibleSpendingChange: -1 (yarıya indi) → 100, 0 (aynı) → 50, +1 (iki katına çıktı) → 0
  const discipline = clamp(50 - input.reducibleSpendingChange * 50);

  // Consistency: art arda katkı yapılan ay sayısı (12 ay = 100)
  const consistency = clamp((input.consecutiveContributionMonths / 12) * 100);

  // Social: 1 circle 50, 2+ circle 100
  const social = clamp(input.circleMembershipCount * 50);

  const score = Math.round(
    contribution * WEIGHTS.contribution +
      discipline * WEIGHTS.discipline +
      consistency * WEIGHTS.consistency +
      social * WEIGHTS.social,
  );

  return {
    score,
    contribution: Math.round(contribution),
    discipline: Math.round(discipline),
    consistency: Math.round(consistency),
    social: Math.round(social),
  };
}

/** Skora göre etiket */
export function scoreLabel(score: number): { label: string; status: string } {
  if (score >= 80) return { label: 'Mükemmel gidiyorsun', status: 'Lider' };
  if (score >= 60) return { label: 'İyi gidiyorsun', status: 'Sağlıklı' };
  if (score >= 40) return { label: 'Geliştirebilirsin', status: 'Orta' };
  if (score >= 20) return { label: 'Başlamak için iyi bir an', status: 'Başlangıç' };
  return { label: 'Birlikte yola çıkalım', status: 'Yeni' };
}
