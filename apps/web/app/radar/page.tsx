'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { categories, fmt, useApp } from '@/lib/stores/use-app';

const RADAR_COLORS: Record<string, string> = {
  coffee: '#8B5E34',
  dining: '#E07A5F',
  subs: '#7A7A7A',
  shopping: '#0066CC',
  transport: '#3D5A80',
};

export default function RadarPage() {
  const router = useRouter();
  const selectCategory = useApp((s) => s.selectCategory);
  const acceptSaving = useApp((s) => s.acceptSaving);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const totalOpp = categories.reduce((s, c) => s + c.opportunity, 0);
  const active = categories.find((c) => c.id === hoverId);

  // Donut math
  const R = 70;
  const STROKE = 22;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = categories.map((c) => {
    const portion = c.spent / totalSpent;
    const dash = portion * C;
    const arc = {
      id: c.id,
      color: RADAR_COLORS[c.id] ?? '#999',
      dash,
      gap: C - dash,
      offset: -offset,
    };
    offset += dash;
    return arc;
  });

  return (
    <PhoneShell title="Tasarruf Radarı">
      <p className="ny-tagline mb-4">Aylık harcamanın dağılımı ve azaltabileceğin pay.</p>

      {!loading && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Harcama</div>
            <div className="ny-tight mt-1 text-base font-semibold">{fmt(totalSpent)}</div>
          </div>
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Fırsat payı</div>
            <div className="ny-tight text-primary mt-1 text-base font-semibold">
              %{Math.round((totalOpp / totalSpent) * 100)}
            </div>
          </div>
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Kabul edilen</div>
            <div className="ny-tight mt-1 text-base font-semibold">
              {Object.values(accepted).filter(Boolean).length}
              <span className="text-xs opacity-50">
                /{categories.filter((c) => c.reducible).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ny-card h-[280px] animate-pulse" />
      ) : (
        <>
          {/* Donut */}
          <div className="ny-card mb-3 flex flex-col items-center !py-6">
            <div className="relative h-[200px] w-[200px]">
              <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
                <circle
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke="hsl(var(--divider-soft))"
                  strokeWidth={STROKE}
                />
                {arcs.map((a) => (
                  <circle
                    key={a.id}
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={hoverId && hoverId !== a.id ? STROKE - 4 : STROKE}
                    strokeDasharray={`${a.dash} ${a.gap}`}
                    strokeDashoffset={a.offset}
                    strokeLinecap="butt"
                    onMouseEnter={() => setHoverId(a.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => setHoverId(a.id === hoverId ? null : a.id)}
                    className="cursor-pointer transition-all"
                    style={{ opacity: hoverId && hoverId !== a.id ? 0.35 : 1 }}
                  />
                ))}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                {active ? (
                  <>
                    <div className="text-2xl">{active.icon}</div>
                    <div className="ny-tight mt-1 text-xl font-semibold">{fmt(active.spent)}</div>
                    <div className="mt-0.5 text-[11px] opacity-60">{active.name}</div>
                  </>
                ) : (
                  <>
                    <div className="ny-eyebrow">Bu ay</div>
                    <div className="ny-tight mt-1 text-2xl font-semibold">{fmt(totalSpent)}</div>
                    <div className="text-primary mt-1 text-[11px]">+{fmt(totalOpp)} fırsat</div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setHoverId(c.id === hoverId ? null : c.id)}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition-opacity ${
                    hoverId && hoverId !== c.id ? 'opacity-40' : ''
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: RADAR_COLORS[c.id] }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Opportunity vs spent */}
          <div className="ny-tile-dark mb-3">
            <div className="text-xs uppercase tracking-wider text-white/60">Azaltılabilir pay</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="ny-tight text-3xl font-semibold">
                %{Math.round((totalOpp / totalSpent) * 100)}
              </div>
              <div className="text-sm text-[hsl(var(--primary-on-dark))]">
                {fmt(totalOpp)} / {fmt(totalSpent)}
              </div>
            </div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-[hsl(var(--primary-on-dark))]"
                style={{ width: `${(totalOpp / totalSpent) * 100}%` }}
              />
            </div>
          </div>

          {/* Category bars */}
          <div className="ny-eyebrow mb-2">Kategoriler</div>
          <div className="space-y-2">
            {categories.map((c) => {
              const isAcc = accepted[c.id];
              const pct = (c.spent / totalSpent) * 100;
              const oppPct = c.spent > 0 ? (c.opportunity / c.spent) * 100 : 0;
              return (
                <div
                  key={c.id}
                  className={`ny-card !p-3 transition-all ${
                    hoverId === c.id ? 'ring-primary/40 ring-2' : ''
                  }`}
                  onMouseEnter={() => setHoverId(c.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <button
                    className="w-full"
                    onClick={() => {
                      selectCategory(c.id);
                      router.push('/category');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{c.name}</span>
                          <span className="text-xs opacity-60">{fmt(c.spent)}</span>
                        </div>
                        <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
                          <div
                            className="h-full"
                            style={{ width: `${pct}%`, background: RADAR_COLORS[c.id] }}
                          />
                          {c.reducible && (
                            <div
                              className="bg-primary/80 absolute top-0 h-full"
                              style={{
                                left: `${pct - (pct * oppPct) / 100}%`,
                                width: `${(pct * oppPct) / 100}%`,
                              }}
                            />
                          )}
                        </div>
                        <div className="mt-1 flex justify-between text-[10px]">
                          <span className="opacity-50">%{Math.round(pct)} pay</span>
                          {c.reducible ? (
                            <span className="text-primary font-semibold">
                              +{fmt(c.opportunity)}
                            </span>
                          ) : (
                            <span className="opacity-50">Azaltılamaz</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  {c.reducible && (
                    <div className="mt-2 flex gap-2 pl-9">
                      <button
                        disabled={isAcc}
                        onClick={() => {
                          setAccepted((a) => ({ ...a, [c.id]: true }));
                          acceptSaving(c.opportunity);
                        }}
                        className="ny-pill-sm flex-1 !py-1.5 !text-xs disabled:opacity-50"
                      >
                        {isAcc ? 'Kabul edildi ✓' : 'Katkıya dönüştür'}
                      </button>
                      <button
                        className="ny-chip !py-1"
                        onClick={() => setAccepted((a) => ({ ...a, [c.id]: false }))}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Link href="/history" className="text-primary mt-5 block w-full text-center text-sm">
            Geçmiş analizleri gör →
          </Link>
        </>
      )}
    </PhoneShell>
  );
}
