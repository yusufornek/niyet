'use client';

/**
 * TourOverlay — tour aktifken render edilen orkestratör.
 *
 * Sorumluluklar:
 * - Mevcut step için doğru route'ta mıyız? Değilse router.push
 * - Backdrop + spotlight + card render
 * - ESC tuşu → skip
 *
 * `isActive=false` iken hiç render edilmez.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useTour } from '@/lib/stores/use-tour';

import { TourCard } from './tour-card';
import { TourSpotlight } from './tour-spotlight';
import { TOUR_STEPS } from './tour-steps';

import './tour-overlay.css';

export function TourOverlay() {
  const isActive = useTour((s) => s.isActive);
  const currentStep = useTour((s) => s.currentStep);
  const skip = useTour((s) => s.skip);
  const router = useRouter();
  const pathname = usePathname();

  // Step değişince doğru sayfaya yönlendir (sadece path farklıysa)
  useEffect(() => {
    if (!isActive) return;
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    // step.route query string içerebilir (örn /savings?tab=goals)
    const targetPath = step.route.split('?')[0];
    if (pathname !== targetPath) {
      router.push(step.route as `/${string}`);
    }
  }, [isActive, currentStep, pathname, router]);

  // ESC = atla
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, skip]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  const hasTarget = step.selector != null;

  return (
    <>
      <div className="tour-backdrop" aria-hidden="true" />
      <TourSpotlight selector={step.selector} />
      <TourCard isFullScreen={!hasTarget} />
    </>
  );
}
