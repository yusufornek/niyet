'use client';

/**
 * RadarContent — radar sayfasının PhoneShell'siz çekirdeği.
 *
 * Hem `/radar` (standalone) hem `/savings` (segmented tab) sayfalarında reuse
 * edilir. PhoneShell wrap'i caller'a bırakılır; rightSlot için "Analiz et"
 * butonu inline gösterilir (caller PhoneShell'e geçirebilir).
 */
import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CategoryAutoSaveWidget } from '@/components/category-auto-save-widget';
import { CategorySpendingAlertWidget } from '@/components/category-spending-alert-widget';
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

interface Props {
  /// Sayfa üstündeki "Analiz et" butonu inline mi yoksa caller'ın rightSlot'a
  /// koyacağı şekilde gizli mi? Default inline=true.
  inlineAnalyzeButton?: boolean;
}

export function RadarContent({ inlineAnalyzeButton = true }: Props) {
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
    <>
      <div className="mb-4 flex items-start justify-between gap-2">
        <p className="ny-tagline">Aylık harcamanın dağılımı ve azaltabileceğin pay.</p>
        {inlineAnalyzeButton && (
          <button
            onClick={() => runAnalysis.mutate(true)}
            disabled={runAnalysis.isPending}
            className="bg-primary text-primary-foreground flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            aria-label="AI ile analiz et"
          >
            <Sparkles size={14} /> {runAnalysis.isPending ? '…' : 'Analiz et'}
          </button>
        )}
      </div>

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

          <div className="ny-eyebrow mb-2">Kategori seç</div>
          <CategoryPicker
            rows={rows}
            totalSpent={totalSpent}
            selectedId={hoverId}
            onSelect={setHoverId}
            acceptedCategories={acceptedCategories}
            onAccept={(category) =>
              acceptCategoryContribution.mutate(
                { category },
                {
                  onSuccess: () => setAcceptedCategories((a) => ({ ...a, [category]: true })),
                },
              )
            }
            acceptPending={acceptCategoryContribution.isPending}
            onOpenDetail={(category) => router.push(`/category/${category}`)}
          />
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
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// CategoryPicker — dropdown + secilen kategorinin detay karti
// (Eski uzun kategori listesinin yerine — kullanici geri bildirimi 2026-05-19)
// ─────────────────────────────────────────────────────────────

interface CategoryRow {
  category: SpendingCategory;
  total: number;
  opportunity: number;
  count: number;
}

interface CategoryPickerProps {
  rows: CategoryRow[];
  totalSpent: number;
  selectedId: string | null;
  onSelect: (id: SpendingCategory | null) => void;
  acceptedCategories: Record<string, boolean>;
  onAccept: (category: SpendingCategory) => void;
  acceptPending: boolean;
  onOpenDetail: (category: SpendingCategory) => void;
}

function CategoryPicker({
  rows,
  totalSpent,
  selectedId,
  onSelect,
  acceptedCategories,
  onAccept,
  acceptPending,
  onOpenDetail,
}: CategoryPickerProps) {
  // Default seçim: en yüksek harcama kategorisi (kullanıcı seçmediyse)
  const sortedRows = [...rows].sort((a, b) => b.total - a.total);
  const effectiveId = selectedId ?? sortedRows[0]?.category ?? null;
  const selected = effectiveId ? rows.find((r) => r.category === effectiveId) : null;

  if (rows.length === 0) {
    return (
      <div className="ny-card !p-3 text-center text-xs opacity-60">
        Henüz kategori verisi yok. AI analizi tetikleyince burada görünecek.
      </div>
    );
  }

  return (
    <div>
      {/* Native select — mobilde sistem picker kullanır */}
      <div className="relative mb-3">
        <select
          value={effectiveId ?? ''}
          onChange={(e) => onSelect(e.target.value as SpendingCategory)}
          aria-label="Kategori seç"
          className="w-full appearance-none rounded-xl border border-[hsl(var(--hairline))] bg-white py-3 pl-10 pr-8 text-sm font-semibold"
        >
          {sortedRows.map((c) => {
            const meta = CATEGORY_META[c.category];
            return (
              <option key={c.category} value={c.category}>
                {meta?.label} — {formatTRY(c.total)}
              </option>
            );
          })}
        </select>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg">
          {selected ? CATEGORY_META[selected.category]?.icon : '📊'}
        </span>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
          ▼
        </span>
      </div>

      {/* Secilen kategorinin detay karti */}
      {selected && (
        <CategoryDetailCard
          row={selected}
          totalSpent={totalSpent}
          isAccepted={Boolean(acceptedCategories[selected.category])}
          onAccept={() => onAccept(selected.category)}
          acceptPending={acceptPending}
          onOpenDetail={() => onOpenDetail(selected.category)}
        />
      )}
    </div>
  );
}

interface DetailCardProps {
  row: CategoryRow;
  totalSpent: number;
  isAccepted: boolean;
  onAccept: () => void;
  acceptPending: boolean;
  onOpenDetail: () => void;
}

function CategoryDetailCard({
  row,
  totalSpent,
  isAccepted,
  onAccept,
  acceptPending,
  onOpenDetail,
}: DetailCardProps) {
  const meta = CATEGORY_META[row.category];
  const pct = totalSpent > 0 ? (row.total / totalSpent) * 100 : 0;
  const oppPct = row.total > 0 ? (row.opportunity / row.total) * 100 : 0;
  const reducible = row.opportunity > 0;

  return (
    <div className="ny-card !p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="text-3xl">{meta?.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold leading-tight">{meta?.label}</div>
          <div className="mt-1 text-[11px] opacity-60">{row.count} işlem · son 30 gün</div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold">{formatTRY(row.total)}</div>
          <div className="text-[10px] opacity-50">%{Math.round(pct)} pay</div>
        </div>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
        <div className="h-full" style={{ width: `${pct}%`, background: meta?.color }} />
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

      <div className="mt-2 flex items-center justify-between text-xs">
        {reducible ? (
          <span className="text-primary font-semibold">
            +{formatTRY(row.opportunity)} azaltılabilir
          </span>
        ) : (
          <span className="opacity-50">Azaltılamaz</span>
        )}
        <button
          onClick={onOpenDetail}
          className="ny-chip !py-1 !text-[11px]"
          aria-label="Kategori detay sayfasını aç"
        >
          Detay →
        </button>
      </div>

      {reducible && (
        <button
          disabled={isAccepted || acceptPending}
          onClick={onAccept}
          className="ny-pill-sm mt-3 w-full !py-2 !text-xs disabled:opacity-50"
          aria-label="Bu kategori fırsatını katkıya dönüştür"
        >
          {isAccepted ? (
            <span className="flex items-center justify-center gap-1">
              <Check size={12} /> Aktarıldı
            </span>
          ) : (
            'Bu kategori fırsatını katkıya dönüştür'
          )}
        </button>
      )}
    </div>
  );
}
