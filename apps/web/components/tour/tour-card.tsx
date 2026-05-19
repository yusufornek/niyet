'use client';

/**
 * TourCard — narration kartı. Bottom-sheet (selector varsa) veya full-screen
 * center (selector null ise). Apple-style ny-card + ny-pill butonlar.
 */
import { useTour } from '@/lib/stores/use-tour';

import { TOUR_STEPS } from './tour-steps';

interface Props {
  isFullScreen: boolean;
}

export function TourCard({ isFullScreen }: Props) {
  const currentStep = useTour((s) => s.currentStep);
  const next = useTour((s) => s.next);
  const skip = useTour((s) => s.skip);

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div
      className={isFullScreen ? 'tour-card-full' : 'tour-card'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-card-title"
      aria-describedby="tour-card-body"
    >
      <div className="ny-card !p-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider opacity-50">
          {currentStep + 1}/{TOUR_STEPS.length}
        </div>
        <h2 id="tour-card-title" className="ny-h2 mb-2 !text-xl">
          {step.title}
        </h2>
        <p id="tour-card-body" className="text-sm leading-relaxed opacity-80">
          {step.body}
        </p>

        <div className="tour-progress-dots my-3">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`tour-progress-dot ${
                i === currentStep ? 'is-current' : i < currentStep ? 'is-passed' : ''
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={skip}
            className="ny-pill-ghost flex-1"
            aria-label={isLast ? 'Turu kapat' : 'Turu atla'}
          >
            {isLast ? 'Kapat' : 'Atla'}
          </button>
          <button
            type="button"
            onClick={next}
            className="ny-pill flex-1"
            aria-label={isLast ? 'Turu bitir' : 'Sonraki adım'}
          >
            {isLast ? 'Bitir 🎉' : `Devam${isFirst ? '' : ' →'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
