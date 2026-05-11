'use client';

import { Users } from 'lucide-react';

import { PhoneShell } from '@/components/phone-shell';
import { useCircles } from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export default function CirclesPage() {
  const { data, isLoading } = useCircles();
  const circles = data?.circles ?? [];

  return (
    <PhoneShell title="Birikim Çemberleri" back>
      <p className="ny-tagline mb-4">Ailen veya topluluğunla ortak hedef.</p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="ny-tile-dark h-40 animate-pulse" />
          ))}
        </div>
      ) : circles.length === 0 ? (
        <p className="ny-tagline">Henüz çember yok.</p>
      ) : (
        <div className="space-y-4">
          {circles.map((c) => {
            const total = c.members.reduce((s, m) => s + m.contribution, 0);
            const pct = c.target > 0 ? (total / c.target) * 100 : 0;
            return (
              <div key={c.id} className="ny-tile-dark">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                  <Users size={14} /> {c.name}
                </div>
                <div className="ny-tight mt-2 text-3xl font-semibold">{formatTRY(total)}</div>
                <div className="mt-1 text-sm text-white/60">Hedef: {formatTRY(c.target)}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[hsl(var(--primary-on-dark))]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-3 space-y-2">
                  {c.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs">
                          {m.user.name[0]}
                        </div>
                        <span>{m.user.name}</span>
                      </div>
                      <span className="text-[hsl(var(--primary-on-dark))]">
                        {formatTRY(m.contribution)}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="ny-pill-sm mt-4">Davet et</button>
              </div>
            );
          })}
        </div>
      )}
    </PhoneShell>
  );
}
