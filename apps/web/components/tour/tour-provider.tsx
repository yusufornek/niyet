'use client';

/**
 * TourProvider — root layout'a wrap edilir. Sorumluluklar:
 *
 * 1. Mount sonrası `useTour.hydrate()` ile localStorage'dan flag oku.
 * 2. Eğer dismissed=false ve kullanıcı dashboard'a (veya kök auth'lu sayfa)
 *    düşmüşse `start()` tetikle.
 * 3. <TourOverlay /> render et (conditional, store'a göre).
 *
 * NOT: Auth flow'da (login/signup/onboarding/consent/connect) tur açılmamalı —
 * kullanıcı önce kayıt olmalı. `dashboard` (+ menü vs.) ana sayfalarda açılır.
 */
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useTour } from '@/lib/stores/use-tour';

import { TourOverlay } from './tour-overlay';

/// Tour'un AÇILABİLECEĞİ sayfalar. Auth/setup akışında otomatik açılmaz.
const TOUR_AUTOSTART_PATHS = new Set<string>([
  '/dashboard',
  '/savings',
  '/menu',
  '/impact',
  '/score',
  '/circles',
  '/cards',
  '/chatbot',
]);

interface Props {
  children: ReactNode;
}

export function TourProvider({ children }: Props) {
  const hydrate = useTour((s) => s.hydrate);
  const start = useTour((s) => s.start);
  const hydrated = useTour((s) => s.hydrated);
  const dismissed = useTour((s) => s.dismissed);
  const isActive = useTour((s) => s.isActive);
  const pathname = usePathname();

  // İlk mount: localStorage hydrate
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Hydrate sonrası, kullanıcı tour'a uygun bir sayfada ise auto-start
  useEffect(() => {
    if (!hydrated || dismissed || isActive) return;
    if (pathname && TOUR_AUTOSTART_PATHS.has(pathname)) {
      start();
    }
  }, [hydrated, dismissed, isActive, pathname, start]);

  return (
    <>
      {children}
      <TourOverlay />
    </>
  );
}
