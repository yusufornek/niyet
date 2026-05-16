import { describe, expect, it } from 'vitest';

import { calculatePausedUntil, describePauseStatus, isUserPaused, PAUSE_LIMITS } from '../pause';

const now = new Date('2026-05-15T12:00:00.000Z');

describe('isUserPaused', () => {
  it('null → aktif', () => {
    expect(isUserPaused(null, now)).toBe(false);
  });

  it('geçmiş tarih → aktif (pause bitmiş)', () => {
    expect(isUserPaused(new Date('2026-05-01T00:00:00.000Z'), now)).toBe(false);
  });

  it('gelecek tarih → pause', () => {
    expect(isUserPaused(new Date('2026-06-15T00:00:00.000Z'), now)).toBe(true);
  });

  it('tam aynı an → aktif (pause bitti sayılır)', () => {
    expect(isUserPaused(now, now)).toBe(false);
  });

  it('geçersiz tarih string → aktif (güvenli fallback)', () => {
    expect(isUserPaused('not-a-date', now)).toBe(false);
  });

  it('ISO string kabul eder', () => {
    expect(isUserPaused('2026-06-15T00:00:00.000Z', now)).toBe(true);
  });
});

describe('describePauseStatus', () => {
  it('null → aktif özeti', () => {
    const s = describePauseStatus(null, now);
    expect(s.isPaused).toBe(false);
    expect(s.pausedUntil).toBeNull();
    expect(s.remainingDays).toBeNull();
    expect(s.summary).toContain('aktif');
  });

  it('15 gün sonrası → 15 kalan', () => {
    const target = new Date('2026-05-30T12:00:00.000Z');
    const s = describePauseStatus(target, now);
    expect(s.isPaused).toBe(true);
    expect(s.remainingDays).toBe(15);
    expect(s.pausedUntil).toBe(target.toISOString());
  });

  it('30 dakika sonrası → 1 gün (ceil)', () => {
    const target = new Date(now.getTime() + 30 * 60 * 1000);
    const s = describePauseStatus(target, now);
    expect(s.remainingDays).toBe(1);
  });
});

describe('calculatePausedUntil', () => {
  it('1 ay sonrasını verir', () => {
    const target = calculatePausedUntil(1, now);
    expect(target.getMonth()).toBe(5); // Haziran (0-indexed)
    expect(target.getDate()).toBe(15);
  });

  it('3 ay sonrası', () => {
    const target = calculatePausedUntil(3, now);
    expect(target.getMonth()).toBe(7); // Ağustos
  });

  it('0 veya negatif → throw', () => {
    expect(() => calculatePausedUntil(0, now)).toThrow();
    expect(() => calculatePausedUntil(-3, now)).toThrow();
  });

  it('max 12 ay clamp', () => {
    const target = calculatePausedUntil(50, now);
    expect(target.getFullYear()).toBe(2027);
    expect(target.getMonth()).toBe(4); // Mayıs
  });

  it('PAUSE_LIMITS export', () => {
    expect(PAUSE_LIMITS.minMonths).toBe(1);
    expect(PAUSE_LIMITS.maxMonths).toBe(12);
  });

  it('float clamp floor', () => {
    const target = calculatePausedUntil(2.7, now);
    expect(target.getMonth()).toBe(6); // 2 ay (Math.floor)
  });
});
