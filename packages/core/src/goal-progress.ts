/**
 * Hedef ilerleme görsel grafiği için pure logic.
 *
 * PBI: "Hedefime ne kadar yaklaştığımı görsel bir ilerleme ekranında
 * görmek istiyorum; birikim sürecimi kolayca takip edebilirim."
 *
 * Mevcut "İlerleme" kartı tek-noktalı (şu anki yüzde). Bu modül zaman
 * eksenli kümülatif birikim noktaları üretir — UI alan grafiği çizebilir.
 */

export interface ContributionInput {
  /** Katkı tutarı (TL). Negatif veya 0 girilirse 0 sayılır. */
  amount: number;
  /** Katkının oluşma zamanı */
  createdAt: Date | string;
}

export interface ContributionTimelinePoint {
  /** Ay başlangıcı ISO tarih (YYYY-MM-01) */
  periodStart: string;
  /** Bu ay içinde eklenen katkı toplamı */
  periodAmount: number;
  /** Window başlangıcından bu ayın sonuna kadar **toplam birikim** */
  cumulativeAmount: number;
}

/**
 * Aylık kümülatif birikim noktaları üret. UI Y-axis "toplam birikim",
 * X-axis "ay" — alan/çizgi grafiği çizilir.
 *
 * Yaklaşım:
 * - Son `monthsBack` ayın her birinin **birinci günü** için bir nokta.
 * - Window'dan ÖNCEKİ katkılar `priorSum`'a toplanır (grafiğin başlangıç
 *   yüksekliği). Window içindekiler ait olduğu aya eklenir.
 * - `cumulativeAmount` = priorSum + (o aya kadar eklenenler).
 *
 * Edge cases:
 * - Boş `contributions`: tüm point'lerde `periodAmount=0`, `cumulativeAmount=0`.
 * - Negatif `amount`: 0 olarak ele alınır (REVERSED filtreleme çağıran tarafta).
 * - Geçersiz tarih: nokta atlanır.
 * - `monthsBack <= 0`: boş dizi döner.
 */
export function buildContributionTimeline(input: {
  contributions: ContributionInput[];
  monthsBack?: number;
  now?: Date;
}): ContributionTimelinePoint[] {
  const monthsBack = Math.max(0, Math.floor(input.monthsBack ?? 6));
  if (monthsBack === 0) return [];

  const now = input.now ?? new Date();

  // Son N ayın "ay başı" tarihlerini eskiden yeniye dizilmiş şekilde üret.
  const points: ContributionTimelinePoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    points.push({
      periodStart: formatMonthStart(d),
      periodAmount: 0,
      cumulativeAmount: 0,
    });
  }

  // Window başı (ilk noktanın ay başı). Bu tarihten önceki katkılar priorSum.
  const windowStart = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

  let priorSum = 0;
  for (const c of input.contributions) {
    const date = parseDate(c.createdAt);
    if (!date) continue;
    const amount = Math.max(0, c.amount);
    if (amount === 0) continue;

    if (date < windowStart) {
      priorSum += amount;
      continue;
    }

    const monthStartIso = formatMonthStart(new Date(date.getFullYear(), date.getMonth(), 1));
    const point = points.find((p) => p.periodStart === monthStartIso);
    if (point) {
      point.periodAmount += amount;
    }
    // Window içinde ama bir noktaya denk gelmiyorsa (örn gelecek ay) sessizce
    // atlanır — caller responsibility (zaten now=bugün, gelecek katkı yok).
  }

  let runningSum = priorSum;
  for (const p of points) {
    runningSum += p.periodAmount;
    p.cumulativeAmount = Math.round(runningSum);
    p.periodAmount = Math.round(p.periodAmount);
  }

  return points;
}

function parseDate(value: Date | string): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function formatMonthStart(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}
