'use client';

/**
 * Spinner — uygulama genelinde "Yükleniyor" göstergesi.
 * Orijinal: uiverse.io/barisdogansutcu — dash4 animasyonu.
 * Renk: Niyet primary mavi (HSL 214,97%,59% benzeri).
 *
 * Kullanım:
 *   <Spinner />                  → default boyut (52px ~ 3.25em)
 *   <Spinner size={32} />        → custom px boyut
 *   <Spinner label="Yükleniyor" /> → label ile yan yana
 */
import './spinner.css';

interface Props {
  size?: number;
  label?: string;
  className?: string;
}

export function Spinner({ size = 52, label, className }: Props) {
  const inner = (
    <svg
      viewBox="25 25 50 50"
      className="niyet-spinner"
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    >
      <circle r="20" cy="50" cx="50" />
    </svg>
  );

  if (label) {
    return (
      <div
        className={`flex items-center justify-center gap-2 ${className ?? ''}`}
        role="status"
        aria-live="polite"
      >
        {inner}
        <span className="text-sm opacity-70">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className ?? ''}`}
      role="status"
      aria-live="polite"
      aria-label="Yükleniyor"
    >
      {inner}
    </div>
  );
}
