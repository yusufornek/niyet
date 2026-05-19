/**
 * useTour — ilk-giriş kullanıcı turu state store'u.
 *
 * Tour, kullanıcı ilk kez dashboard'a düştüğünde otomatik başlar; tüm
 * adımlar bittiğinde veya kullanıcı "Atla" derse localStorage'a
 * `niyet:tour-completed-v1` yazılır. Versiyonlu key — ileride tour
 * akışı değişirse bumping ile yeniden gösterilir.
 *
 * SSR-safe: localStorage sadece browser'da; mount sonrası `hydrate()`
 * tetiklenir.
 */
'use client';

import { create } from 'zustand';

import { TOUR_STEPS } from '@/components/tour/tour-steps';

const STORAGE_KEY = 'niyet:tour-completed-v1';

interface TourState {
  /// Overlay görünür mü? (false: idle, true: aktif)
  isActive: boolean;
  /// 0..N-1 (N = TOUR_STEPS.length)
  currentStep: number;
  /// localStorage'da "tamamlandı" flag var mı? Hydrate sonrası gerçek değer.
  dismissed: boolean;
  /// Hydrate edildi mi? (false → henüz mount olmadı, hiçbir şey yapma)
  hydrated: boolean;

  hydrate: () => void;
  /// Tour'u başlat. Eğer dismissed=true ise sessiz reddeder.
  start: () => void;
  next: () => void;
  prev: () => void;
  /// Kullanıcı "Atla" dedi → complete + flag yaz
  skip: () => void;
  /// Final step'te "Bitir" → complete + flag yaz
  complete: () => void;
  /// Settings → "Turu tekrar başlat" — flag temizle, dashboard'a yönlendir
  /// (yönlendirme caller'da, store sadece state reset eder)
  restart: () => void;
}

export const useTour = create<TourState>((set, get) => ({
  isActive: false,
  currentStep: 0,
  dismissed: false,
  hydrated: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const flag = window.localStorage.getItem(STORAGE_KEY);
    set({ dismissed: flag === 'true', hydrated: true });
  },

  start: () => {
    const { dismissed, hydrated, isActive } = get();
    if (!hydrated || dismissed || isActive) return;
    set({ isActive: true, currentStep: 0 });
  },

  next: () => {
    const { currentStep } = get();
    if (currentStep >= TOUR_STEPS.length - 1) {
      get().complete();
      return;
    }
    set({ currentStep: currentStep + 1 });
  },

  prev: () => {
    const { currentStep } = get();
    if (currentStep <= 0) return;
    set({ currentStep: currentStep - 1 });
  },

  skip: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    set({ isActive: false, dismissed: true, currentStep: 0 });
  },

  complete: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    set({ isActive: false, dismissed: true, currentStep: 0 });
  },

  restart: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set({ isActive: true, dismissed: false, currentStep: 0 });
  },
}));
