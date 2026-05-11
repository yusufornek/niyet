/**
 * Savings opportunity hesap motoru.
 *
 * "Bu kullanıcı için bu kategoride ne kadar azaltılabilir harcama var?"
 * Soruya istatistiksel cevap üretir — Gemini'nin verdiği detaylı önerinin
 * yanında deterministic bir baseline.
 *
 * Pure functions — DB bağımlılığı yok, sadece TX listesi alır.
 */

import type { SpendingCategory } from './types';
import { DEFAULT_REDUCIBLE_CATEGORIES } from './constants';

export interface Transaction {
  amount: number;
  category: SpendingCategory;
  occurredAt: Date | string;
  isReducible?: boolean;
  opportunity?: number;
}

export interface CategoryOpportunity {
  category: SpendingCategory;
  totalSpent: number;
  txCount: number;
  averageAmount: number;
  /** Azaltılabilir tahmini (kategori için %) */
  estimatedReducible: number;
}

/**
 * Tahmini "azaltılabilirlik oranları" — kategori bazlı sezgisel kurallar.
 * Gemini bunu override eder, ama AI çalışmadan önce de UI'da değer gösterilmeli.
 */
const REDUCIBILITY_HEURISTIC: Partial<Record<SpendingCategory, number>> = {
  COFFEE: 0.3,
  FOOD_DELIVERY: 0.25,
  DINING_OUT: 0.2,
  SUBSCRIPTIONS: 0.4,
  ONLINE_SHOPPING: 0.2,
  CLOTHING: 0.15,
  ENTERTAINMENT: 0.15,
};

export function categoryBreakdown(transactions: Transaction[]): CategoryOpportunity[] {
  const grouped = new Map<SpendingCategory, Transaction[]>();
  for (const tx of transactions) {
    const arr = grouped.get(tx.category) ?? [];
    arr.push(tx);
    grouped.set(tx.category, arr);
  }

  const out: CategoryOpportunity[] = [];
  for (const [category, txs] of grouped) {
    const totalSpent = txs.reduce((s, t) => s + t.amount, 0);
    const heuristic = REDUCIBILITY_HEURISTIC[category] ?? 0;
    // AI'ın işaretlediği opportunity'ler varsa onları öncelikle topla, yoksa heuristic
    const aiOpportunity = txs.reduce((s, t) => s + (t.opportunity ?? 0), 0);
    const estimatedReducible = aiOpportunity > 0 ? aiOpportunity : totalSpent * heuristic;

    out.push({
      category,
      totalSpent,
      txCount: txs.length,
      averageAmount: totalSpent / txs.length,
      estimatedReducible: Math.round(estimatedReducible),
    });
  }

  // En fazla harcamadan en aza sırala
  return out.sort((a, b) => b.totalSpent - a.totalSpent);
}

/** Toplam aylık tasarruf fırsatı tahmini (TL) */
export function totalMonthlyOpportunity(transactions: Transaction[]): number {
  const breakdown = categoryBreakdown(transactions);
  return breakdown
    .filter((c) => DEFAULT_REDUCIBLE_CATEGORIES.includes(c.category))
    .reduce((s, c) => s + c.estimatedReducible, 0);
}

/** Yıllık projeksiyon: aylık tasarruf × 12 + bileşik enflasyon dahil */
export function annualProjection(monthlyOpportunity: number, inflationPct = 0): number {
  // Basit: enflasyon yokken ay × 12
  if (inflationPct === 0) return monthlyOpportunity * 12;
  // Enflasyon varsa: artan birikim (geometric series)
  const r = inflationPct / 100 / 12;
  return monthlyOpportunity * ((Math.pow(1 + r, 12) - 1) / r);
}
