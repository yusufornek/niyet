'use client';

import type { ContributionTimelinePoint } from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

/**
 * Hedef için aylık kümülatif birikim grafiği — SVG area chart.
 *
 * Pure presentation (yan etki yok). Backend `Goal.contributionTimeline`
 * field'ından besleniyor. PBI: "birikim sürecimi kolayca takip edebilirim."
 *
 * Boş veri durumu: friendly empty state ("Henüz katkı yok").
 */
export function GoalProgressTimeline({
  timeline,
  targetAmount,
}: {
  timeline: ContributionTimelinePoint[];
  /** Hedef tutar (yatay referans çizgisi için) */
  targetAmount: number;
}) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="ny-card mb-4">
        <div className="ny-eyebrow mb-2">Birikim grafiği</div>
        <div className="text-sm opacity-60">
          Bu hedefe henüz katkı bağlanmadı. Tasarruf radarından bir kategoriyi bu hedefe
          yönlendirince grafik burada başlar.
        </div>
      </div>
    );
  }

  // Son nokta = mevcut kümülatif birikim
  const last = timeline[timeline.length - 1]!;
  const lastMonthAdd = last.periodAmount;
  const totalSaved = last.cumulativeAmount;

  // Grafik boyutları
  const w = 320;
  const h = 100;
  const padX = 4;
  const padY = 8;

  const maxValue = Math.max(targetAmount, ...timeline.map((p) => p.cumulativeAmount), 1);
  const xStep = (w - 2 * padX) / Math.max(1, timeline.length - 1);

  const toY = (value: number) => h - padY - (value / maxValue) * (h - 2 * padY);

  // Polyline noktaları
  const pts = timeline.map((p, i) => `${padX + i * xStep},${toY(p.cumulativeAmount)}`).join(' ');
  // Area path (polyline + alt çizgi)
  const areaPath =
    `M ${padX},${h - padY} ` +
    timeline.map((p, i) => `L ${padX + i * xStep},${toY(p.cumulativeAmount)}`).join(' ') +
    ` L ${padX + (timeline.length - 1) * xStep},${h - padY} Z`;

  const targetY = toY(targetAmount);
  const progressPct = Math.min(100, (totalSaved / Math.max(1, targetAmount)) * 100);

  return (
    <div className="ny-card mb-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="ny-eyebrow">Birikim grafiği</div>
        <span className="text-[10px] opacity-60">Son {timeline.length} ay</span>
      </div>

      {/* Üst metrik bloğu */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight">{formatTRY(totalSaved)}</div>
          <div className="text-xs opacity-60">
            toplam · %{progressPct.toFixed(0)} hedefe ulaşıldı
          </div>
        </div>
        {lastMonthAdd > 0 && (
          <div className="text-right">
            <div className="text-primary text-sm font-bold">+{formatTRY(lastMonthAdd)}</div>
            <div className="text-xs opacity-60">bu ay</div>
          </div>
        )}
      </div>

      {/* SVG area chart */}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-24 w-full"
        role="img"
        aria-label={`Son ${timeline.length} ay birikim grafiği, toplam ${formatTRY(totalSaved)}`}
      >
        {/* Hedef referans çizgisi (yatay, kesik) */}
        {targetY >= padY && targetY <= h - padY && (
          <line
            x1={padX}
            x2={w - padX}
            y1={targetY}
            y2={targetY}
            stroke="hsl(var(--hairline))"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        {/* Area fill */}
        <path d={areaPath} fill="hsl(var(--primary))" fillOpacity="0.12" />
        {/* Line */}
        <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2" points={pts} />
        {/* Son nokta vurgu */}
        <circle
          cx={padX + (timeline.length - 1) * xStep}
          cy={toY(last.cumulativeAmount)}
          r="3.5"
          fill="hsl(var(--primary))"
        />
      </svg>

      {/* X-axis labels (basit) */}
      <div className="mt-1 flex justify-between text-[10px] opacity-50">
        <span>{formatMonth(timeline[0]!.periodStart)}</span>
        {timeline.length > 2 && (
          <span>{formatMonth(timeline[Math.floor(timeline.length / 2)]!.periodStart)}</span>
        )}
        <span>{formatMonth(last.periodStart)}</span>
      </div>

      <div className="mt-2 text-[10px] opacity-50">
        Kesik çizgi = hedef tutar ({formatTRY(targetAmount)})
      </div>
    </div>
  );
}

function formatMonth(iso: string): string {
  // YYYY-MM-01 → "Ock" / "Hzr" tarzı kısa ay
  const [yearStr, monthStr] = iso.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString('tr-TR', { month: 'short' });
}
