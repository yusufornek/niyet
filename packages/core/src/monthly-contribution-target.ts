/**
 * Monthly Contribution Target — kullanıcının aylık katkı hedefine yaklaşma /
 * ulaşma seviyesini hesaplayan saf fonksiyon.
 *
 * PBI: "Katkı hedefime yaklaştığımda bildirim almak istiyorum; böylece düzenli
 * birikim alışkanlığımı sürdürebilirim."
 *
 * Tasarım:
 * - Saf fn — UI/infrastructure agnostic.
 * - Spending Alert PBI'ının simetriği: harcama yerine katkı, "aşıldı kötü"
 *   yerine "ulaşıldı iyi".
 * - "Katkı"nın tanımı: REVERSED hariç tüm MicroContribution amount'larının
 *   bu ay içindeki toplamı. Kullanıcı manuel/auto-save/rule/reducible —
 *   hangi yoldan gelirse gelsin sayılır (kullanıcının pratik tasarruf etkisi).
 */
export type MonthlyTargetLevel = 'BEHIND' | 'NEAR' | 'REACHED';

export interface MonthlyContributionShape {
  /// Pozitif TL tutarı (negatif = REVERSED, dışarıda filtrele veya pass ile gel)
  amount: number;
  /// Katkının yapıldığı an
  createdAt: Date;
}

export interface MonthlyContributionEvaluation {
  monthYear: string;
  targetAmount: number;
  /// Bu ay biriken toplam katkı (TL)
  contributedAmount: number;
  /// Hedefe kalan tutar. ≤ 0 → hedef aşıldı/ulaşıldı.
  remainingAmount: number;
  utilizationPct: number;
  warnThresholdPct: number;
  level: MonthlyTargetLevel;
}

export function monthlyTargetMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Bu ay için aylık katkı hedefi değerlendirmesi.
 *
 * Edge cases:
 * - targetAmount ≤ 0 → BEHIND + utilizationPct=0 (anlamsız ama hata yutarak)
 * - contributedAmount < 0 → 0 olarak işle (net negatif olmasın)
 * - warnThresholdPct < 0 veya > 1 → clamp [0, 1]
 * - Geçersiz monthYear → throw (input validation)
 *
 * Level kuralı:
 * - utilization ≥ 1 → REACHED (hedefe ulaşıldı, kullanıcıyı tebrik et)
 * - warnThresholdPct ≤ utilization < 1 → NEAR (yaklaşıyor, devam et!)
 * - utilization < warnThresholdPct → BEHIND (henüz sessiz, bildirim yok)
 */
export function evaluateMonthlyContributionTarget(input: {
  contributions: ReadonlyArray<MonthlyContributionShape>;
  targetAmount: number;
  monthYear: string;
  warnThresholdPct?: number;
}): MonthlyContributionEvaluation {
  const warnThresholdPct = clamp01(input.warnThresholdPct ?? 0.9);
  const targetAmount = Math.max(0, input.targetAmount);

  const [yStr, mStr] = input.monthYear.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new Error(`Geçersiz ay formatı: "${input.monthYear}". Beklenen: YYYY-MM`);
  }
  const start = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
  const end = Date.UTC(year, month, 1, 0, 0, 0, 0);

  let total = 0;
  for (const c of input.contributions) {
    const t = c.createdAt.getTime();
    if (t < start || t >= end) continue;
    total += c.amount;
  }
  const contributedAmount = Math.max(0, round2(total));

  const utilizationPct = targetAmount > 0 ? round4(contributedAmount / targetAmount) : 0;
  const remainingAmount = round2(targetAmount - contributedAmount);

  let level: MonthlyTargetLevel = 'BEHIND';
  if (targetAmount > 0) {
    if (utilizationPct >= 1) {
      level = 'REACHED';
    } else if (utilizationPct >= warnThresholdPct) {
      level = 'NEAR';
    }
  }

  return {
    monthYear: input.monthYear,
    targetAmount,
    contributedAmount,
    remainingAmount,
    utilizationPct,
    warnThresholdPct,
    level,
  };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.9;
  return Math.max(0, Math.min(1, v));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
