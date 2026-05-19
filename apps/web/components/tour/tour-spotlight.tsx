'use client';

/**
 * TourSpotlight — target element'in etrafında pozisyon hesaplar, mavi halka
 * gösterir. getBoundingClientRect + ResizeObserver ile dinamik. Target null
 * veya bulunamıyorsa hiçbir şey render etmez.
 */
import { useEffect, useState } from 'react';

interface Props {
  selector: string | null;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourSpotlight({ selector }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let observer: ResizeObserver | null = null;

    const update = (el: Element) => {
      const r = el.getBoundingClientRect();
      const padding = 8;
      setRect({
        top: r.top - padding,
        left: r.left - padding,
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
      // İlk pozisyon hesap
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Scroll animation'ı bitsin diye kısa beklet
      setTimeout(() => {
        if (cancelled) return;
        update(el);
        observer = new ResizeObserver(() => update(el));
        observer.observe(el);
        observer.observe(document.body);
      }, 320);
    };

    tryFind(20); // ~1.6 saniye boyunca DOM'da element ara

    const onResize = () => {
      const el = document.querySelector(selector);
      if (el) update(el);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [selector]);

  if (!rect) return null;

  return (
    <div
      className="tour-spotlight"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
      aria-hidden="true"
    />
  );
}
