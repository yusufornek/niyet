'use client';

import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { fmt, subscriptions } from '@/lib/stores/use-app';

type Mark = 'active' | 'cancellable';

export default function SubscriptionsPage() {
  const initial = Object.fromEntries(subscriptions.map((s) => [s.id, s.status])) as Record<
    string,
    Mark
  >;
  const [marks, setMarks] = useState<Record<string, Mark>>(initial);
  const cancellable = subscriptions.filter((s) => marks[s.id] === 'cancellable');
  const monthly = cancellable.reduce((sum, s) => sum + s.amount, 0);
  return (
    <PhoneShell title="Abonelikler" back>
      <p className="ny-tagline mb-4">Düzenli ödemelerini gözden geçir.</p>

      <div className="ny-tile-dark mb-4">
        <div className="text-xs uppercase tracking-wider text-white/60">
          İptal edilebilir tasarruf
        </div>
        <div className="ny-tight mt-1 text-3xl font-semibold">
          {fmt(monthly)}
          <span className="text-base text-white/60"> /ay</span>
        </div>
        <div className="mt-1 text-sm text-white/60">Yıllık {fmt(monthly * 12)}</div>
      </div>

      <div className="space-y-3">
        {subscriptions.map((s) => {
          const m = marks[s.id];
          return (
            <div key={s.id} className="ny-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs opacity-60">
                    {s.freq} · {fmt(s.amount)}
                  </div>
                </div>
                {m === 'cancellable' && (
                  <span className="text-primary text-xs font-semibold">İptal edilebilir</span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setMarks((x) => ({ ...x, [s.id]: 'active' }))}
                  className={`ny-chip flex-1 justify-center ${
                    m === 'active' ? 'border-primary text-primary' : ''
                  }`}
                >
                  Kullanıyorum
                </button>
                <button
                  onClick={() => setMarks((x) => ({ ...x, [s.id]: 'cancellable' }))}
                  className={`ny-chip flex-1 justify-center ${
                    m === 'cancellable' ? 'border-primary text-primary' : ''
                  }`}
                >
                  İptal edilebilir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </PhoneShell>
  );
}
