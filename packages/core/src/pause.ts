/**
 * Pause (Nefes Ayı) — geçici katkı duraklatma.
 *
 * PBI: "Maddi olarak zorlandığım dönemlerde katkılarımı geçici olarak
 * duraklatmak istiyorum; sistem üzerimde baskı oluşturmasın."
 *
 * Domain modeli: `User.pausedUntil: DateTime?`
 * - null veya geçmişte → kullanıcı aktif
 * - gelecekte → kullanıcı paused (cron'lar atlar, AI yumuşar)
 *
 * Pure functions — DB/UI agnostic.
 */

export interface PauseStatus {
  /** Şu an pause mu? */
  isPaused: boolean;
  /** Pause'un bitiş tarihi (ISO). isPaused=false ise null. */
  pausedUntil: string | null;
  /** Kalan gün sayısı (yuvarlanmış yukarı). isPaused=false ise null. */
  remainingDays: number | null;
  /** Kullanıcıya gösterilecek özet metin */
  summary: string;
}

const MIN_PAUSE_MONTHS = 1;
const MAX_PAUSE_MONTHS = 12;

/**
 * Kullanıcı şu an pause halinde mi? Açık karar: `pausedUntil > now` yalnızca.
 *
 * Edge case: tam aynı an (pausedUntil === now) → false (pause bitti sayılır).
 */
export function isUserPaused(pausedUntil: Date | string | null, now?: Date): boolean {
  if (pausedUntil == null) return false;
  const target = pausedUntil instanceof Date ? pausedUntil : new Date(pausedUntil);
  if (!Number.isFinite(target.getTime())) return false;
  const reference = now ?? new Date();
  return target.getTime() > reference.getTime();
}

/**
 * UI için pause durumunun tam özetini üret. Backend de aynı şeyi
 * `Me.pauseStatus` üzerinden dönerek frontend ile tek kaynak korur.
 */
export function describePauseStatus(pausedUntil: Date | string | null, now?: Date): PauseStatus {
  if (!isUserPaused(pausedUntil, now)) {
    return {
      isPaused: false,
      pausedUntil: null,
      remainingDays: null,
      summary: 'Katkıların aktif.',
    };
  }

  const reference = now ?? new Date();
  const target = pausedUntil instanceof Date ? pausedUntil : new Date(pausedUntil as string);
  const msPerDay = 24 * 60 * 60 * 1000;
  const remainingDays = Math.max(1, Math.ceil((target.getTime() - reference.getTime()) / msPerDay));

  return {
    isPaused: true,
    pausedUntil: target.toISOString(),
    remainingDays,
    summary: `Nefes ayı: ${remainingDays} gün daha duraklatıldı.`,
  };
}

/**
 * UI'nın girdiği "X ay duraklat" isteğini `pausedUntil` tarihine çevirir.
 * Aylar 1-12 aralığına clamp edilir; geçersiz input için throw eder.
 */
export function calculatePausedUntil(months: number, now?: Date): Date {
  if (!Number.isFinite(months) || months <= 0) {
    throw new Error('Duraklatma süresi en az 1 ay olmalı.');
  }
  const clamped = Math.min(MAX_PAUSE_MONTHS, Math.max(MIN_PAUSE_MONTHS, Math.floor(months)));
  const reference = now ?? new Date();
  const target = new Date(reference);
  target.setMonth(target.getMonth() + clamped);
  return target;
}

export const PAUSE_LIMITS = {
  minMonths: MIN_PAUSE_MONTHS,
  maxMonths: MAX_PAUSE_MONTHS,
} as const;
