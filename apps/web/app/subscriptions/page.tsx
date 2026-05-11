'use client';

import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { useSubscriptions, type SubscriptionStatus } from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export default function SubscriptionsPage() {
  const { data, isLoading } = useSubscriptions();
  const subs = data?.subscriptions ?? [];

  // Lokal override — server'a yansıtma Faz 10'da subscription mutation eklenince
  const [overrides, setOverrides] = useState<Record<string, SubscriptionStatus>>({});
  const getStatus = (id: string, fallback: SubscriptionStatus): SubscriptionStatus =>
    overrides[id] ?? fallback;

  const cancellable = subs.filter((s) => getStatus(s.id, s.status) === 'CANCELLABLE');
  const monthly = cancellable.reduce((sum, s) => sum + s.amount, 0);

  return (
    <PhoneShell title="Abonelikler" back>
      <p className="ny-tagline mb-4">Düzenli ödemelerini gözden geçir.</p>

      <div className="ny-tile-dark mb-4">
        <div className="text-xs uppercase tracking-wider text-white/60">
          İptal edilebilir tasarruf
        </div>
        <div className="ny-tight mt-1 text-3xl font-semibold">
          {formatTRY(monthly)}
          <span className="text-base text-white/60"> /ay</span>
        </div>
        <div className="mt-1 text-sm text-white/60">Yıllık {formatTRY(monthly * 12)}</div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ny-card h-20 animate-pulse" />
          ))}
        </div>
      ) : subs.length === 0 ? (
        <p className="ny-tagline">
          Henüz abonelik tespit edilmedi. AI analizi tetiklendiğinde otomatik bulunur.
        </p>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => {
            const m = getStatus(s.id, s.status);
            return (
              <div key={s.id} className="ny-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs opacity-60">Aylık · {formatTRY(s.amount)}</div>
                  </div>
                  {m === 'CANCELLABLE' && (
                    <span className="text-primary text-xs font-semibold">İptal edilebilir</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setOverrides((x) => ({ ...x, [s.id]: 'ACTIVE' }))}
                    className={`ny-chip flex-1 justify-center ${
                      m === 'ACTIVE' ? 'border-primary text-primary' : ''
                    }`}
                  >
                    Kullanıyorum
                  </button>
                  <button
                    onClick={() => setOverrides((x) => ({ ...x, [s.id]: 'CANCELLABLE' }))}
                    className={`ny-chip flex-1 justify-center ${
                      m === 'CANCELLABLE' ? 'border-primary text-primary' : ''
                    }`}
                  >
                    İptal edilebilir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PhoneShell>
  );
}
