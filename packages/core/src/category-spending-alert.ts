/**
 * Category Spending Alert — kullanıcının kategori için aylık limit'e yaklaştığını
 * tespit eden saf hesap.
 *
 * PBI: "Azaltmak istediğim harcama kategorilerine yaklaştığımda uyarı almak
 * istiyorum; böylece anlık harcama kararlarımı daha bilinçli verebilirim."
 *
 * Tasarım:
 * - Pure fn — UI ve infrastructure agnostic.
 * - Eşik mantığı: < warnPct → BELOW, ≥ warnPct ama < %100 → WARNING, ≥ %100 → OVER.
 * - "WARNING" eşiği kullanıcı tercihi (default %80) — bazen erken uyarı isterler.
 * - Negatif limit veya 0 limit anlamsız; saf fn'da bunu input validation'a bırakırız
 *   (Zod), burada sadece pozitif limit varsayar.
 */
import type { SpendingCategory } from './types';

export type CategoryAlertLevel = 'BELOW' | 'WARNING' | 'OVER';

export interface CategorySpendingTxShape {
  amount: number;
  category: SpendingCategory;
  occurredAt: Date;
}

export interface CategorySpendingEvaluation {
  category: SpendingCategory;
  monthYear: string;
  monthlyLimit: number;
  /// "Bu ay" toplam harcama (TL)
  spentAmount: number;
  /// Limite ne kadar kaldı (TL). Negatif olabilir (limit aşıldı).
  remainingAmount: number;
  /// 0-1 arası (1.5 mümkün — aşımda)
  utilizationPct: number;
  /// Warning eşiği (örn 0.8 = %80)
  warnThresholdPct: number;
  level: CategoryAlertLevel;
}

/**
 * Bir tarih için "YYYY-MM" üret (UTC).
 */
export function spendingAlertMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Ana hesap — kullanıcının bu ayki kategori harcamasına göre alert seviyesini ver.
 *
 * Saf — argümanları muteyt etmez.
 *
 * Edge cases:
 * - monthlyLimit ≤ 0 → BELOW + utilizationPct=0 (anlamsız ama hata yutarak)
 * - spentAmount < 0 → 0 olarak işle (iadeler net etkili olur, negatif net = 0)
 * - warnThresholdPct < 0 veya > 1 → clamp [0, 1]
 */
export function evaluateCategoryThreshold(input: {
  transactions: ReadonlyArray<CategorySpendingTxShape>;
  category: SpendingCategory;
  monthlyLimit: number;
  monthYear: string;
  warnThresholdPct?: number;
}): CategorySpendingEvaluation {
  const warnThresholdPct = clamp01(input.warnThresholdPct ?? 0.8);
  const monthlyLimit = Math.max(0, input.monthlyLimit);

  // Bu ay'ın aralığı (UTC)
  const [yStr, mStr] = input.monthYear.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new Error(`Geçersiz ay formatı: "${input.monthYear}". Beklenen: YYYY-MM`);
  }
  const start = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
  const end = Date.UTC(year, month, 1, 0, 0, 0, 0);

  let total = 0;
  for (const tx of input.transactions) {
    if (tx.category !== input.category) continue;
    const t = tx.occurredAt.getTime();
    if (t < start || t >= end) continue;
    total += tx.amount;
  }
  const spentAmount = Math.max(0, round2(total));

  const utilizationPct = monthlyLimit > 0 ? round4(spentAmount / monthlyLimit) : 0;
  const remainingAmount = round2(monthlyLimit - spentAmount);

  let level: CategoryAlertLevel = 'BELOW';
  if (monthlyLimit > 0) {
    if (utilizationPct >= 1) {
      level = 'OVER';
    } else if (utilizationPct >= warnThresholdPct) {
      level = 'WARNING';
    }
  }

  return {
    category: input.category,
    monthYear: input.monthYear,
    monthlyLimit,
    spentAmount,
    remainingAmount,
    utilizationPct,
    warnThresholdPct,
    level,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.8;
  return Math.max(0, Math.min(1, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
