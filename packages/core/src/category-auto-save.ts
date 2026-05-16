/**
 * Category Auto-Save — Ortalama-altı harcama farkı hesabı.
 *
 * Kullanıcı bir kategoride (örn. "Kahve", "Yemek Siparişi") önceki N ayın
 * ortalamasının altında harcadığında, oluşan farkı otomatik mikro katkıya
 * dönüştürmek için ihtiyaç duyulan deterministic hesap.
 *
 * Pure fonksiyon — UI ve infrastructure agnostic.
 *
 * Mühendislik notu:
 * - PBI çıktısının kullanıcı tarafındaki vaadi "fark etmeden": deterministic ve
 *   tahmin edilebilir olmalı, AI yorumuna bağlı kalmamalı.
 * - "Ortalama" tanımı: lookback ay'ların aylık toplamlarının aritmetik
 *   ortalaması. Daha sofistike pencere (EWMA, mevsimsel düzeltme) ileride
 *   eklenebilir; YAGNI gereği şimdilik basit ortalama.
 * - Lookback aylarında "veri yok" demek "ortalama bilinemez" demek — bu
 *   durumda fark üretmeyiz (insufficient data).
 */
import type { SpendingCategory } from './types';

/**
 * Bu fonksiyonun minimal beklediği transaction shape'i. `Transaction` tipi
 * `savings-engine.ts`'te tanımlı; burada gevşek bir contract ile bağlanıyoruz
 * — böylece DB tarafı veya AI tarafı kendi tx tipini geçirebilir.
 */
export interface AutoSaveTxShape {
  amount: number;
  category: SpendingCategory;
  occurredAt: Date;
}

/**
 * Bir ay'ı [start, end) aralığı olarak temsil eder (UTC).
 */
export interface MonthRange {
  /// "YYYY-MM" formatında ay etiketi
  monthYear: string;
  start: Date;
  end: Date;
}

/**
 * Belirli bir ayın toplam harcaması + işlem sayısı.
 */
export interface CategoryMonthSpend {
  monthYear: string;
  amount: number;
  txCount: number;
}

/**
 * Shortfall hesap sonucu — "bu ayki harcama, önceki ortalamanın ne kadar altında?"
 */
export interface CategoryShortfallResult {
  /// Hesabın yapıldığı hedef ay
  monthYear: string;
  /// Bu ayki gerçek harcama (negatif değer asla — pozitif para çıkışı)
  currentAmount: number;
  /// Lookback ay'larının ortalaması (yeterli veri yoksa null)
  averageAmount: number | null;
  /// Lookback aylar ham veri (transparency)
  lookback: CategoryMonthSpend[];
  /// İncelenen lookback ay sayısı
  lookbackMonthsAnalyzed: number;
  /// Yeterli geçmiş veri var mı? (en az 1 dolu ay)
  hasSufficientHistory: boolean;
  /// Fark > 0 ise tasarruf, ≤ 0 ise bu ay ortalama veya üzerinde
  shortfallAmount: number;
  /// Yüzde olarak fark (averageAmount > 0 koşulunda anlamlı)
  shortfallPct: number | null;
  /// Auto-save tetiklenmeli mi? (yeterli history + shortfall > 0)
  shouldTrigger: boolean;
}

/**
 * Bir tarih için "YYYY-MM" üret.
 */
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Bir hedef tarihten geriye doğru N ay listesini üret (hedef ay HARİÇ).
 * Örn. monthYear='2026-05', lookback=3 → ['2026-02', '2026-03', '2026-04']
 *
 * UTC bazlı — saat dilimi sürprizleri olmasın.
 */
export function buildLookbackMonths(monthYear: string, lookback: number): MonthRange[] {
  if (lookback <= 0) return [];
  const [yStr, mStr] = monthYear.split('-');
  const year = Number(yStr);
  const month = Number(mStr); // 1-12
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new Error(`Geçersiz ay formatı: "${monthYear}". Beklenen: YYYY-MM`);
  }

  const ranges: MonthRange[] = [];
  for (let offset = lookback; offset >= 1; offset--) {
    // JS month: 0-indexed. month=5 (May) means index 4.
    const start = new Date(Date.UTC(year, month - 1 - offset, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1 - offset + 1, 1, 0, 0, 0, 0));
    ranges.push({
      monthYear: monthKey(start),
      start,
      end,
    });
  }
  return ranges;
}

/**
 * Bir ay'ın aralığını döndür (target ay).
 */
export function getMonthRange(monthYear: string): MonthRange {
  const [yStr, mStr] = monthYear.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { monthYear, start, end };
}

/**
 * Bir transaction listesinden, belirli kategori + ay için toplam harcama + count.
 *
 * Beklenen tx şekli: { amount: number, category: SpendingCategory, occurredAt: Date }
 * Negatif amount'lar (iade) toplam üzerinde net etkili olur — gerçek "para çıkışı" ölçülür.
 */
export function sumCategoryForMonth(
  transactions: ReadonlyArray<AutoSaveTxShape>,
  category: SpendingCategory,
  range: MonthRange,
): CategoryMonthSpend {
  let total = 0;
  let count = 0;
  for (const tx of transactions) {
    if (tx.category !== category) continue;
    const t = tx.occurredAt.getTime();
    if (t < range.start.getTime() || t >= range.end.getTime()) continue;
    total += tx.amount;
    count++;
  }
  return {
    monthYear: range.monthYear,
    amount: round2(total),
    txCount: count,
  };
}

/**
 * Ana hesap: bir kategori + hedef ay için "ortalama-altı fark" değerini bul.
 *
 * Saf fonksiyon — argümanları muteyt etmez, dış kaynak okumaz.
 */
export function computeCategoryShortfall(input: {
  transactions: ReadonlyArray<AutoSaveTxShape>;
  category: SpendingCategory;
  monthYear: string;
  lookbackMonths: number;
}): CategoryShortfallResult {
  const { transactions, category, monthYear, lookbackMonths } = input;

  const targetRange = getMonthRange(monthYear);
  const lookbackRanges = buildLookbackMonths(monthYear, lookbackMonths);

  const current = sumCategoryForMonth(transactions, category, targetRange);
  const lookback = lookbackRanges.map((r) => sumCategoryForMonth(transactions, category, r));

  // "Yeterli history": en az 1 lookback ayında **işlem** var (sıfır da kabul).
  // Eğer 3 ay boyunca hiç işlem yoksa bu kategori için kullanıcının
  // davranış pattern'i bilinmiyor demektir → fark üretmeyiz.
  const monthsWithAnyActivity = lookback.filter((m) => m.txCount > 0).length;
  const hasSufficientHistory = monthsWithAnyActivity >= 1;

  let averageAmount: number | null = null;
  if (hasSufficientHistory && lookback.length > 0) {
    // Sıfır ay'ları da ortalamaya dahil ediyoruz — kullanıcı bazen hiç
    // o kategoride harcamıyor olabilir, bu da legitimate bir geçmiş davranış.
    // Yalnız tüm ay'lar sıfır ise hasSufficientHistory=false olduğu için
    // bu noktaya zaten ulaşmıyoruz.
    const sum = lookback.reduce((s, m) => s + m.amount, 0);
    averageAmount = round2(sum / lookback.length);
  }

  const shortfallAmount = averageAmount != null ? round2(averageAmount - current.amount) : 0;
  const shortfallPct =
    averageAmount != null && averageAmount > 0 ? round4(shortfallAmount / averageAmount) : null;

  // Tetikleme kuralı:
  // - Yeterli history olmalı
  // - Fark pozitif olmalı (bu ay ortalamanın ALTINDA)
  // - Çok küçük rakamları filtrele: en az 1 TL fark (mikro katkı dünyasında
  //   1 TL altı micro-noise sayılır)
  const shouldTrigger = hasSufficientHistory && shortfallAmount >= 1;

  return {
    monthYear,
    currentAmount: current.amount,
    averageAmount,
    lookback,
    lookbackMonthsAnalyzed: lookback.length,
    hasSufficientHistory,
    shortfallAmount,
    shortfallPct,
    shouldTrigger,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
