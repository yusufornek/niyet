'use client';

import { TrendingUp } from 'lucide-react';

import { PhoneShell } from '@/components/phone-shell';
import { useFutureScoreInsights } from '@/lib/graphql/queries';

export default function ScorePage() {
  const { data, isLoading } = useFutureScoreInsights();
  const score = data?.futureScoreInsights.current;
  const insight = data?.futureScoreInsights;

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
          <TrendingUp size={14} /> {insight?.delta ?? 0} puan bu hafta
        </div>
      </div>
      {!isLoading && insight && (
        <div className="ny-card mb-4">
          <div className="text-sm font-semibold">{insight.label}</div>
          <div className="mt-1 text-xs opacity-70">
            En yüksek etki: {insight.topDriver.metric} ({insight.topDriver.delta > 0 ? '+' : ''}
            {insight.topDriver.delta})
          </div>
        </div>
      )}
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
      {!isLoading && insight && (
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold">Rozetler</h2>
          {insight.badges.length === 0 ? (
            <div className="ny-card text-sm opacity-70">Henüz rozet açılmadı.</div>
          ) : (
            <div className="space-y-2">
              {insight.badges.map((badge) => (
                <div key={badge.key} className="ny-card flex items-center justify-between text-sm">
                  <span>{badge.title}</span>
                  <span className="opacity-60">
                    {new Date(badge.unlockedAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PhoneShell>
  );
}
