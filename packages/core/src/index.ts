/**
 * @niyet/core — Niyet'in paylaşımlı domain çekirdeği.
 *
 * Bu paket UI agnostic + infrastructure agnostic. Sadece pure functions
 * ve tip tanımları. Hem web (Next.js) hem ileride mobile (RN Expo)
 * burada tanımlı business logic'i kullanır.
 *
 * Detay: ENGINEERING.md §2 (Clean Architecture katmanları)
 */

export * from './constants';
export * from './types';
export * from './formatters';
export * from './future-score';
export * from './savings-engine';
export * from './goal-tracking';
export * from './goal-plan';
export * from './goal-price-schedule';
