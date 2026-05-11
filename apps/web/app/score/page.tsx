'use client';

import { TrendingUp } from 'lucide-react';

import { PhoneShell } from '@/components/phone-shell';
import { useFutureScore } from '@/lib/graphql/queries';

export default function ScorePage() {
  const { data, isLoading } = useFutureScore();
  const score = data?.futureScore;

  const factors = score
    ? [
        { name: 'Düzenli katkı', v: score.contribution },
        { name: 'Harcama disiplini', v: score.discipline },
        { name: 'Katkı sürekliliği', v: score.consistency },
        { name: 'Sosyal katılım', v: score.social },
      ]
    : [];

  return (
    <PhoneShell title="Gelecek Skoru" back>
      <div className="ny-tile-dark mb-5 py-8 text-center">
        <div className="text-xs uppercase tracking-wider text-white/60">Skorun</div>
        <div className="ny-tight mt-2 text-[88px] font-semibold leading-none">
          {isLoading ? '…' : (score?.score ?? 0)}
        </div>
        <div className="mt-2 text-white/60">üzerinden 100</div>
        <div className="mt-3 inline-flex items-center gap-1 text-sm text-[hsl(var(--primary-on-dark))]">
          <TrendingUp size={14} /> Aktif takip
        </div>
      </div>
      <p className="ny-tagline mb-4">
        Skorun seni cezalandırmak için değil, motive etmek için var.
      </p>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ny-card h-14 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {factors.map((f) => (
            <div key={f.name} className="ny-card">
              <div className="mb-2 flex justify-between text-sm">
                <span>{f.name}</span>
                <span className="font-semibold">{f.v}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
                <div className="bg-primary h-full" style={{ width: `${f.v}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PhoneShell>
  );
}
