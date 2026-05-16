'use client';

import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CategoryAutoSaveWidget } from '@/components/category-auto-save-widget';
import { CategorySpendingAlertWidget } from '@/components/category-spending-alert-widget';
import { PhoneShell } from '@/components/phone-shell';
import {
  useAcceptCategoryContribution,
  useCategoryBreakdown,
  useRunAnalysis,
  type SpendingCategory,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

const CATEGORY_META: Record<SpendingCategory, { label: string; icon: string; color: string }> = {
  MARKET: { label: 'Market', icon: '🛒', color: '#16a34a' },
  FOOD_DELIVERY: { label: 'Yemek Siparişi', icon: '🛵', color: '#f97316' },
  COFFEE: { label: 'Kahve', icon: '☕', color: '#8B5E34' },
  DINING_OUT: { label: 'Dışarı Yemek', icon: '🍽', color: '#E07A5F' },
  TRANSPORT: { label: 'Ulaşım', icon: '🚇', color: '#3D5A80' },
  FUEL: { label: 'Yakıt', icon: '⛽', color: '#d97706' },
  BILLS: { label: 'Faturalar', icon: '🧾', color: '#475569' },
  SUBSCRIPTIONS: { label: 'Abonelikler', icon: '📺', color: '#7A7A7A' },
  ONLINE_SHOPPING: { label: 'Online Alışveriş', icon: '🛍', color: '#0066CC' },
  CLOTHING: { label: 'Giyim', icon: '👕', color: '#ec4899' },
  HEALTH: { label: 'Sağlık', icon: '💊', color: '#0d9488' },
  ENTERTAINMENT: { label: 'Eğlence', icon: '🎬', color: '#c026d3' },
  EDUCATION: { label: 'Eğitim', icon: '📚', color: '#6366f1' },
  SPORTS: { label: 'Spor', icon: '🏋️', color: '#0891b2' },
  OTHER: { label: 'Diğer', icon: '✨', color: '#64748b' },
};

export default function RadarPage() {
  const router = useRouter();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const { data, isLoading } = useCategoryBreakdown('LAST_30D');
  const runAnalysis = useRunAnalysis();
  const acceptCategoryContribution = useAcceptCategoryContribution();
  const [acceptedCategories, setAcceptedCategories] = useState<Record<string, boolean>>({});

  const rows = data?.categoryBreakdown ?? [];
  const totalSpent = rows.reduce((s, c) => s + c.total, 0);
  const totalOpp = rows.reduce((s, c) => s + c.opportunity, 0);
  const active = rows.find((c) => c.category === hoverId);
  const reducibleCount = rows.filter((c) => c.opportunity > 0).length;
  const acceptedCount = Object.values(acceptedCategories).filter(Boolean).length;

  const R = 70;
  const STROKE = 22;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = rows.map((c) => {
    const portion = totalSpent > 0 ? c.total / totalSpent : 0;
    const dash = portion * C;
    const arc = {
      id: c.category,
      color: CATEGORY_META[c.category]?.color ?? '#999',
      dash,
      gap: C - dash,
      offset: -offset,
    };
    offset += dash;
    return arc;
  });

  return (
    <PhoneShell
      title="Tasarruf Radarı"
      rightSlot={
        <button
          onClick={() => runAnalysis.mutate(true)}
          disabled={runAnalysis.isPending}
          className="bg-primary text-primary-foreground flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          aria-label="AI ile analiz et"
        >
          <Sparkles size={14} /> {runAnalysis.isPending ? '…' : 'Analiz et'}
        </button>
      }
    >
      <p className="ny-tagline mb-4">Aylık harcamanın dağılımı ve azaltabileceğin pay.</p>

      {!isLoading && rows.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Harcama</div>
            <div className="ny-tight mt-1 text-base font-semibold">{formatTRY(totalSpent)}</div>
          </div>
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Fırsat payı</div>
            <div className="ny-tight text-primary mt-1 text-base font-semibold">
              %{totalSpent > 0 ? Math.round((totalOpp / totalSpent) * 100) : 0}
            </div>
          </div>
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Kabul edilen</div>
            <div className="ny-tight mt-1 text-base font-semibold">
              {acceptedCount}
              <span className="text-xs opacity-50">/{reducibleCount}</span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="ny-card h-[280px] animate-pulse" />
      ) : (
        <>
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
                    <div className="text-2xl">{CATEGORY_META[active.category]?.icon}</div>
                    <div className="ny-tight mt-1 text-xl font-semibold">
                      {formatTRY(active.total)}
                    </div>
                    <div className="mt-0.5 text-[11px] opacity-60">
                      {CATEGORY_META[active.category]?.label}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ny-eyebrow">Son 30 gün</div>
                    <div className="ny-tight mt-1 text-2xl font-semibold">
                      {formatTRY(totalSpent)}
                    </div>
                    <div className="text-primary mt-1 text-[11px]">
                      +{formatTRY(totalOpp)} fırsat
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {rows.map((c) => (
                <button
                  key={c.category}
                  onClick={() => setHoverId(c.category === hoverId ? null : c.category)}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition-opacity ${
                    hoverId && hoverId !== c.category ? 'opacity-40' : ''
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: CATEGORY_META[c.category]?.color }}
                  />
                  {CATEGORY_META[c.category]?.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ny-tile-dark mb-3">
            <div className="text-xs uppercase tracking-wider text-white/60">Azaltılabilir pay</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="ny-tight text-3xl font-semibold">
                %{totalSpent > 0 ? Math.round((totalOpp / totalSpent) * 100) : 0}
              </div>
              <div className="text-sm text-[hsl(var(--primary-on-dark))]">
                {formatTRY(totalOpp)} / {formatTRY(totalSpent)}
              </div>
            </div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-[hsl(var(--primary-on-dark))]"
                style={{ width: `${totalSpent > 0 ? (totalOpp / totalSpent) * 100 : 0}%` }}
              />
            </div>
          </div>

          <CategorySpendingAlertWidget />
          <CategoryAutoSaveWidget />

          <div className="ny-eyebrow mb-2">Kategoriler</div>
          <div className="space-y-2">
            {rows.map((c) => {
              const meta = CATEGORY_META[c.category];
              const isAcc = acceptedCategories[c.category];
              const pct = totalSpent > 0 ? (c.total / totalSpent) * 100 : 0;
              const oppPct = c.total > 0 ? (c.opportunity / c.total) * 100 : 0;
              const reducible = c.opportunity > 0;
              return (
                <div
                  key={c.category}
                  className={`ny-card !p-3 transition-all ${
                    hoverId === c.category ? 'ring-primary/40 ring-2' : ''
                  }`}
                  onMouseEnter={() => setHoverId(c.category)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <button className="w-full" onClick={() => router.push(`/category/${c.category}`)}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{meta?.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{meta?.label}</span>
                          <span className="text-xs opacity-60">{formatTRY(c.total)}</span>
                        </div>
                        <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
                          <div
                            className="h-full"
                            style={{ width: `${pct}%`, background: meta?.color }}
                          />
                          {reducible && (
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
                          <span className="opacity-50">
                            %{Math.round(pct)} pay · {c.count} işlem
                          </span>
                          {reducible ? (
                            <span className="text-primary font-semibold">
                              +{formatTRY(c.opportunity)}
                            </span>
                          ) : (
                            <span className="opacity-50">Azaltılamaz</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  {reducible && (
                    <div className="mt-2 flex gap-2 pl-9">
                      <button
                        disabled={isAcc || acceptCategoryContribution.isPending}
                        onClick={() => {
                          acceptCategoryContribution.mutate(
                            { category: c.category },
                            {
                              onSuccess: () =>
                                setAcceptedCategories((a) => ({ ...a, [c.category]: true })),
                            },
                          );
                        }}
                        className="ny-pill-sm flex-1 !py-1.5 !text-xs disabled:opacity-50"
                      >
                        {isAcc ? (
                          <span className="flex items-center justify-center gap-1">
                            <Check size={12} /> Aktarıldı
                          </span>
                        ) : (
                          'Katkıya dönüştür'
                        )}
                      </button>
                      <button
                        onClick={() => router.push(`/category/${c.category}`)}
                        className="ny-chip !py-1 text-[11px]"
                      >
                        Detay
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/contributions" className="ny-pill-ghost text-center text-sm">
              Katkılarım →
            </Link>
            <Link href="/history" className="ny-pill-ghost text-center text-sm">
              Analiz geçmişi →
            </Link>
          </div>
        </>
      )}
    </PhoneShell>
  );
}
