'use client';

import { Sparkles, TrendingUp } from 'lucide-react';

import { useSavingsProjection } from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

/**
 * "Küçük adım, büyük etki" — bugünkü tasarruf fırsatının aylık → yıllık → uzun
 * vadeli compound emeklilik birikimine etkisini gösterir.
 *
 * Backend `savingsProjection` query'sinden besleniyor. Bugün için açılan
 * fırsat yoksa son 7 günün ortalaması fallback olarak gelir (`isEstimated`).
 */
export function SavingsProjectionWidget() {
  const { data: proj, isLoading } = useSavingsProjection();

  if (isLoading) {
    return <div className="ny-card h-32 animate-pulse" />;
  }

  if (!proj || proj.todayAmount <= 0) {
    return (
      <div className="ny-card">
        <div className="ny-eyebrow mb-2">Küçük adım, büyük etki</div>
        <div className="text-sm opacity-70">
          Bugün açılmış bir tasarruf fırsatı yok. Önce harcama radarından bir kategoriyi azalt
          deneyimini başlat, projeksiyon burada görünecek.
        </div>
      </div>
    );
  }

  const longest = proj.horizon[proj.horizon.length - 1];
  const middle = proj.horizon.find((h) => h.years !== longest?.years) ?? proj.horizon[0];

  return (
    <div className="ny-card border-primary/20 from-primary/5 bg-gradient-to-br to-transparent">
      <div className="mb-2 flex items-center justify-between">
        <div className="ny-eyebrow">Küçük adım, büyük etki</div>
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
          <Sparkles size={10} /> projeksiyon
        </span>
      </div>

      {/* Hero — en uzun horizon vurgu */}
      {longest && (
        <div className="mb-3">
          <div className="text-text/60 text-xs">
            Bugünkü tasarruf {proj.annualReturnPct}% yıllık getiriyle{' '}
            <span className="font-semibold">{longest.years} yılda</span>
          </div>
          <div className="text-primary mt-0.5 text-3xl font-bold tracking-tight">
            {formatTRY(longest.totalAmount)}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] opacity-60">
            <TrendingUp size={10} />
            <span>
              {formatTRY(longest.totalContributed)} yatırılır, {formatTRY(longest.growth)} getiri
            </span>
          </div>
        </div>
      )}

      {/* Progression — bugün → ay → yıl → middle horizon */}
      <div className="grid grid-cols-4 gap-2">
        <ProjectionStep label="Bugün" amount={proj.todayAmount} dim />
        <ProjectionStep label="Ay" amount={proj.monthlyAmount} arrow />
        <ProjectionStep label="Yıl" amount={proj.yearlyAmount} arrow />
        {middle && middle.years !== longest?.years && (
          <ProjectionStep
            label={`${middle.years} yıl`}
            amount={middle.totalAmount}
            arrow
            highlight
          />
        )}
      </div>

      {proj.isEstimated && (
        <div className="mt-3 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
          Bugün henüz yeni fırsat yok — son 7 günün günlük ortalamasından tahmin.
        </div>
      )}

      <div className="mt-2 text-[10px] opacity-50">
        Future Value of Annuity formülü, %{proj.annualReturnPct} yıllık nominal getiri varsayımı.
        Yatırım tavsiyesi değildir.
      </div>
    </div>
  );
}

function ProjectionStep({
  label,
  amount,
  arrow,
  highlight,
  dim,
}: {
  label: string;
  amount: number;
  arrow?: boolean;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border px-2 py-2 text-center ${
        highlight ? 'border-primary/40 bg-primary/5' : 'border-[hsl(var(--hairline))] bg-white/60'
      }`}
    >
      {arrow && (
        <span className="absolute -left-2 top-1/2 -translate-y-1/2 text-[10px] opacity-40">→</span>
      )}
      <div className={`text-[10px] uppercase tracking-wide ${dim ? 'opacity-50' : 'opacity-60'}`}>
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold ${highlight ? 'text-primary' : ''} ${dim ? 'opacity-80' : ''}`}
      >
        {formatTRY(amount)}
      </div>
    </div>
  );
}
