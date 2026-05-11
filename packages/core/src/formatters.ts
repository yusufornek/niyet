/**
 * Türkçe formatlayıcılar — TL para, tarih, yüzde.
 * Cross-package: hem web hem mobile aynı formatları kullanmalı.
 */

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const TRY_DECIMAL_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR');

const PERCENT_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const DATE_FORMATTER_LONG = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const DATE_FORMATTER_SHORT = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
});

/** "1.250 ₺" gibi yuvarlanmış TL gösterimi */
export const formatTRY = (value: number | string | bigint): string =>
  TRY_FORMATTER.format(Number(value));

/** "1.250,75 ₺" gibi 2 ondalıklı TL gösterimi */
export const formatTRYDecimal = (value: number | string | bigint): string =>
  TRY_DECIMAL_FORMATTER.format(Number(value));

/** "1.250" gibi düz Türkçe sayı */
export const formatNumber = (value: number | bigint): string => NUMBER_FORMATTER.format(value);

/** 0.32 → "%32" */
export const formatPercent = (value: number): string => PERCENT_FORMATTER.format(value);

/** "11 Mayıs 2026" */
export const formatDateLong = (value: Date | string): string =>
  DATE_FORMATTER_LONG.format(new Date(value));

/** "11.05.26" */
export const formatDateShort = (value: Date | string): string =>
  DATE_FORMATTER_SHORT.format(new Date(value));

/** "09:41" */
export const formatTime = (value: Date | string): string => TIME_FORMATTER.format(new Date(value));
