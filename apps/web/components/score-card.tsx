'use client';

import { TrendingUp } from 'lucide-react';
import { useState } from 'react';

import './score-card.css';

type Stat = { label: string; value: string; foot?: string };

type Props = {
  score?: number;
  delta?: number;
  title?: string;
  subtitle?: string;
  status?: string;
  stats?: Stat[];
  onOpen?: () => void;
};

/**
 * Future Score kartı — 3D-flip ile detay açılır.
 * Mockup'taki orijinal pattern korundu.
 */
export function ScoreCard({
  score = 68,
  delta = 4,
  title = 'İyi gidiyorsun',
  subtitle = 'Skorun seni motive etmek için var.',
  status = 'Sağlıklı',
  stats = [],
  onOpen,
}: Props) {
  const [open, setOpen] = useState(false);
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;

  const deltaSign = delta > 0 ? '+' : '';

  return (
    <div className={`score-stage ${open ? 'is-open' : ''}`}>
      <div className="score-cardm">
        <div
          className="score-card"
          onClick={() => {
            setOpen((v) => !v);
            onOpen?.();
          }}
          role="button"
          tabIndex={0}
        >
          <div className="eyebrow">Gelecek Skoru</div>
          <div className="score-card-title">{title}</div>
          <div className="score-card-sub">{subtitle}</div>

          <div className="score-ring">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle
                cx="36"
                cy="36"
                r={r}
                fill="none"
                stroke="hsl(var(--divider-soft))"
                strokeWidth="6"
              />
              <circle
                cx="36"
                cy="36"
                r={r}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
                transform="rotate(-90 36 36)"
              />
            </svg>
            <div className="score-ring-num">
              <b>{score}</b>
              <span>/100</span>
            </div>
          </div>

          <span className="score-delta">
            <TrendingUp size={12} /> {deltaSign}
            {delta} bu hafta
          </span>
          <span className="score-cta">Detayı gör →</span>
        </div>

        <div className="score-card2">
          <div className="score-card2-inner">
            <div className="score-stats">
              {stats.map((s, i) => (
                <div key={i}>
                  <div className="score-stat-label">{s.label}</div>
                  <div className="score-stat-value">{s.value}</div>
                  {s.foot && <div className="score-stat-foot">{s.foot}</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="score-status-strip">
            <span className="score-status-dot" />
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
