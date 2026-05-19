'use client';

/**
 * TourOverlay — tour aktifken render edilen orkestratör.
 *
 * Sorumluluklar:
 * - Portal ile `#phone-shell-host` (PhoneShell mobile frame) içine render — overlay
 *   web sitesinin tamamına değil, **iPhone preview çerçevesi içinde** kalır.
 * - Mevcut step için doğru route'ta mıyız? Değilse router.push.
 * - 3 katman çizer:
 *   1. Blur backdrop — radial-gradient mask ile target bölgesinde **delik açar**
 *      (target net, dışı blur + dim)
 *   2. Mavi spotlight ring — target etrafında halka (pointer-events: none)
 *   3. Narration card — target varsa bottom, yoksa center
 * - ESC = atla
 *
 * `isActive=false` iken hiç render edilmez.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useTour } from '@/lib/stores/use-tour';

import { TourCard } from './tour-card';
import { TOUR_STEPS } from './tour-steps';

import './tour-overlay.css';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const isActive = useTour((s) => s.isActive);
  const currentStep = useTour((s) => s.currentStep);
  const skip = useTour((s) => s.skip);
  const router = useRouter();
  const pathname = usePathname();

  const [host, setHost] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  // Step değişince doğru sayfaya yönlendir
  useEffect(() => {
    if (!isActive) return;
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    const targetPath = step.route.split('?')[0];
    if (pathname !== targetPath) {
      router.push(step.route as `/${string}`);
    }
  }, [isActive, currentStep, pathname, router]);

  // PhoneShell host'unu mount sonrası bul + size izle
  useLayoutEffect(() => {
    if (!isActive) {
      setHost(null);
      return;
    }
    const el = document.getElementById('phone-shell-host');
    setHost(el);
    if (!el) return;
    const updateSize = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isActive]);

  // Target element pozisyon hesabı (container-relative)
  useEffect(() => {
    if (!isActive || !host) return;
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    const selector = step.selector;
    if (!selector) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let rafId = 0;

    const computeRect = (el: Element) => {
      const r = el.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const padding = 8;
      setRect({
        top: r.top - hostRect.top - padding,
        left: r.left - hostRect.left - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      });
    };

    const tryFind = (attemptsLeft: number) => {
      if (cancelled) return;
      const el = document.querySelector(selector);
      if (!el) {
        if (attemptsLeft > 0) {
          setTimeout(() => tryFind(attemptsLeft - 1), 80);
        } else {
          setRect(null);
        }
        return;
      }
      // Off-screen ise scroll
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Scroll bitmesini bekle, sonra rect hesapla
      setTimeout(() => {
        if (cancelled) return;
        computeRect(el);
        observer = new ResizeObserver(() => {
          // RAF ile throttle
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => computeRect(el));
        });
        observer.observe(el);
        observer.observe(host);
      }, 320);
    };

    tryFind(25);

    const onScroll = () => {
      const el = document.querySelector(selector);
      if (el) computeRect(el);
    };
    // Scroll listener — PhoneShell içindeki scroll container
    const scrollContainer = host.querySelector('.overflow-y-auto');
    scrollContainer?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelAnimationFrame(rafId);
      scrollContainer?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [isActive, currentStep, host]);

  // ESC = atla
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, skip]);

  if (!isActive || !host) return null;

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  const hasTarget = step.selector != null && rect != null;

  // Mask: target varsa o bölge transparent (yani blur YOK), dışı opaque (blur var)
  // mask-image radial-gradient ile dynamic spotlight delik
  const maskStyle =
    hasTarget && rect
      ? buildMask(rect, containerSize)
      : { background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' };

  return createPortal(
    <>
      {/* Backdrop: blur + dim, target bölgesi mask ile çıkarılmış */}
      <div className="tour-backdrop" style={maskStyle} aria-hidden="true" />

      {/* Mavi ring sadece target varsa */}
      {hasTarget && rect && (
        <div
          className="tour-ring"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          aria-hidden="true"
        />
      )}

      <TourCard isFullScreen={!hasTarget} />
    </>,
    host,
  );
}

/**
 * Backdrop için CSS mask oluştur — target bölgesi transparent (blur uygulanmaz),
 * dışındaki alan opaque (blur uygulanır).
 *
 * `radial-gradient` ile elips spotlight + tutarsız border-radius için `-webkit-mask`.
 */
function buildMask(rect: Rect, container: { w: number; h: number }) {
  // Spotlight için biraz feather (soft edge) - target sınırlarında % 100 transparent,
  // ~12px dışında % 100 opaque
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // Maximum radius = rect'in en uzun yarı-köşesi + feather
  const rx = rect.width / 2 + 6;
  const ry = rect.height / 2 + 6;
  const feather = 14;
  const maskValue = `radial-gradient(ellipse ${rx + feather}px ${ry + feather}px at ${cx}px ${cy}px, transparent ${(Math.min(rx, ry) / (Math.min(rx, ry) + feather)) * 100}%, black 100%)`;

  void container;
  return {
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    WebkitMaskImage: maskValue,
    maskImage: maskValue,
  } as React.CSSProperties;
}
