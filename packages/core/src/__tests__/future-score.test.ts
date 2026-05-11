import { describe, expect, it } from 'vitest';

import { computeFutureScore, scoreLabel } from '../future-score';

describe('computeFutureScore', () => {
  it('hiç katkı yapmamış kullanıcıya düşük skor verir', () => {
    const result = computeFutureScore({
      recentContributionCount: 0,
      activeRulesCount: 0,
      reducibleSpendingChange: 0,
      activeGoalsCount: 0,
      consecutiveContributionMonths: 0,
      circleMembershipCount: 0,
    });
    expect(result.contribution).toBe(0);
    expect(result.discipline).toBe(50);
    expect(result.consistency).toBe(0);
    expect(result.social).toBe(0);
    expect(result.score).toBeLessThan(20);
  });

  it('düzenli haftalık katkı yapan kullanıcıya yüksek skor verir', () => {
    const result = computeFutureScore({
      recentContributionCount: 4,
      activeRulesCount: 2,
      reducibleSpendingChange: -0.3,
      activeGoalsCount: 2,
      consecutiveContributionMonths: 12,
      circleMembershipCount: 1,
    });
    expect(result.contribution).toBe(100);
    expect(result.consistency).toBe(100);
    expect(result.score).toBeGreaterThan(80);
  });

  it('reducible harcama %50 azalmışsa discipline 100', () => {
    const result = computeFutureScore({
      recentContributionCount: 0,
      activeRulesCount: 0,
      reducibleSpendingChange: -1,
      activeGoalsCount: 0,
      consecutiveContributionMonths: 0,
      circleMembershipCount: 0,
    });
    expect(result.discipline).toBe(100);
  });

  it('reducible harcama iki katına çıkmışsa discipline 0', () => {
    const result = computeFutureScore({
      recentContributionCount: 0,
      activeRulesCount: 0,
      reducibleSpendingChange: 1,
      activeGoalsCount: 0,
      consecutiveContributionMonths: 0,
      circleMembershipCount: 0,
    });
    expect(result.discipline).toBe(0);
  });

  it('skor her zaman 0-100 aralığında', () => {
    // Aşırı yüksek değerlerle bile cap'lenmeli
    const result = computeFutureScore({
      recentContributionCount: 100,
      activeRulesCount: 50,
      reducibleSpendingChange: -10,
      activeGoalsCount: 100,
      consecutiveContributionMonths: 100,
      circleMembershipCount: 100,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.contribution).toBeLessThanOrEqual(100);
    expect(result.discipline).toBeLessThanOrEqual(100);
    expect(result.consistency).toBeLessThanOrEqual(100);
    expect(result.social).toBeLessThanOrEqual(100);
  });
});

describe('scoreLabel', () => {
  it.each([
    [85, 'Mükemmel gidiyorsun', 'Lider'],
    [65, 'İyi gidiyorsun', 'Sağlıklı'],
    [45, 'Geliştirebilirsin', 'Orta'],
    [25, 'Başlamak için iyi bir an', 'Başlangıç'],
    [10, 'Birlikte yola çıkalım', 'Yeni'],
  ])('skor %i için label: %s, status: %s', (score, label, status) => {
    expect(scoreLabel(score)).toEqual({ label, status });
  });
});
