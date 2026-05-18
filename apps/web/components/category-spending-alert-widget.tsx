'use client';

/**
 * Category Spending Alert Widget
 *
 * Kullaniciya "azaltmak istedigim kategorilerde aylik limit + esik uyari"
 * tercihini yonettirir. Radar sayfasinda yer alir.
 *
 * Akis:
 * 1) Mevcut limit kurallari + kullanim yuzdeleri.
 * 2) "Şimdi değerlendir" — tum aktif kurallari calistir, esik gecisi varsa
 *    toast + Notification.
 * 3) "Yeni limit ekle" — onerilen kategorilerden hizli kategori secimi + tutar.
 */
import { AlertCircle, AlertTriangle, Play, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  useCategorySpendingAlerts,
  useCreateCategorySpendingAlert,
  useDeleteCategorySpendingAlert,
  useEvaluateMyCategorySpendingAlerts,
  usePreviewCategorySpendingAlert,
  useUpdateCategorySpendingAlert,
  type CategorySpendingAlertLevel,
  type SpendingCategory,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

const CATEGORY_LABEL: Record<SpendingCategory, { label: string; icon: string }> = {
  MARKET: { label: 'Market', icon: '🛒' },
  FOOD_DELIVERY: { label: 'Yemek Siparişi', icon: '🛵' },
  COFFEE: { label: 'Kahve', icon: '☕' },
  DINING_OUT: { label: 'Dışarı Yemek', icon: '🍽' },
  TRANSPORT: { label: 'Ulaşım', icon: '🚇' },
  FUEL: { label: 'Yakıt', icon: '⛽' },
  BILLS: { label: 'Faturalar', icon: '🧾' },
  SUBSCRIPTIONS: { label: 'Abonelikler', icon: '📺' },
  ONLINE_SHOPPING: { label: 'Online Alışveriş', icon: '🛍' },
  CLOTHING: { label: 'Giyim', icon: '👕' },
  HEALTH: { label: 'Sağlık', icon: '💊' },
  ENTERTAINMENT: { label: 'Eğlence', icon: '🎬' },
  EDUCATION: { label: 'Eğitim', icon: '📚' },
  SPORTS: { label: 'Spor', icon: '🏋️' },
  OTHER: { label: 'Diğer', icon: '✨' },
};

const RECOMMENDED: SpendingCategory[] = [
  'COFFEE',
  'FOOD_DELIVERY',
  'DINING_OUT',
  'ONLINE_SHOPPING',
  'ENTERTAINMENT',
  'CLOTHING',
];

export function CategorySpendingAlertWidget() {
  const { data: alerts, isLoading } = useCategorySpendingAlerts();
  const createAlert = useCreateCategorySpendingAlert();
  const deleteAlert = useDeleteCategorySpendingAlert();
  const evaluate = useEvaluateMyCategorySpendingAlerts();

  const [picking, setPicking] = useState(false);

  const list = useMemo(() => alerts ?? [], [alerts]);
  const used = useMemo(() => new Set(list.map((a) => a.category)), [list]);
  const recommendable = RECOMMENDED.filter((c) => !used.has(c));

  return (
    <section className="ny-card mb-3 !p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="text-amber-600" />
            <h3 className="text-sm font-semibold">Harcama limit uyarıları</h3>
          </div>
          <p className="mt-1 text-[11px] leading-tight opacity-60">
            Bir kategoride limite yaklaştığında ya da aştığında bildirim al.
          </p>
        </div>
        {list.length > 0 && (
          <button
            onClick={() => evaluate.mutate(undefined)}
            disabled={evaluate.isPending}
            className="ny-pill-sm flex shrink-0 items-center gap-1 !py-1 !text-[11px] disabled:opacity-50"
            aria-label="Şimdi değerlendir"
          >
            <Play size={11} /> {evaluate.isPending ? '…' : 'Şimdi değerlendir'}
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded-lg bg-[hsl(var(--divider-soft))]" />
          <div className="h-12 animate-pulse rounded-lg bg-[hsl(var(--divider-soft))]" />
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-lg bg-[hsl(var(--divider-soft))] p-3 text-[11px] leading-tight opacity-70">
          Henüz limit yok. Aşağıdan bir kategori seç, aylık limit belirle, sistem yaklaştığında
          uyarsın.
        </p>
      ) : (
        <ul className="mb-2 space-y-2">
          {list.map((a) => (
            <AlertRow key={a.id} alert={a} onDelete={() => deleteAlert.mutate(a.id)} />
          ))}
        </ul>
      )}

      {!picking && recommendable.length > 0 && (
        <button
          onClick={() => setPicking(true)}
          className="ny-pill-ghost mt-2 flex w-full items-center justify-center gap-1.5 !py-1.5 !text-xs"
          aria-label="Yeni limit ekle"
        >
          <Plus size={12} /> Yeni limit ekle
        </button>
      )}

      {picking && (
        <PickerForm
          available={recommendable}
          onSubmit={(category, monthlyLimit) => {
            createAlert.mutate({ category, monthlyLimit });
            setPicking(false);
          }}
          onCancel={() => setPicking(false)}
          pending={createAlert.isPending}
        />
      )}
    </section>
  );
}

interface AlertRowProps {
  alert: {
    id: string;
    category: SpendingCategory;
    monthlyLimit: number;
    warnThresholdPct: number;
    active: boolean;
    lastAlertedMonth: string | null;
    lastAlertedLevel: string | null;
  };
  onDelete: () => void;
}

function AlertRow({ alert, onDelete }: AlertRowProps) {
  const { data: preview } = usePreviewCategorySpendingAlert({
    category: alert.category,
    monthlyLimit: alert.monthlyLimit,
    warnThresholdPct: alert.warnThresholdPct,
  });
  const updateAlert = useUpdateCategorySpendingAlert();
  const meta = CATEGORY_LABEL[alert.category];

  const level: CategorySpendingAlertLevel = preview?.level ?? 'BELOW';
  const utilPct = Math.min(150, Math.round((preview?.utilizationPct ?? 0) * 100));
  const spent = preview?.spentAmount ?? 0;

  return (
    <li className="rounded-lg bg-[hsl(var(--divider-soft))]/40 p-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">{meta.label}</span>
            <LevelBadge level={level} />
          </div>
          <div className="mt-1 text-[10px] opacity-70">
            <b>{formatTRY(spent)}</b> / {formatTRY(alert.monthlyLimit)} (%{utilPct})
          </div>
        </div>
        <button
          onClick={() => updateAlert.mutate({ id: alert.id, active: !alert.active })}
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            alert.active ? 'bg-primary/15 text-primary' : 'bg-[hsl(var(--divider-soft))] opacity-60'
          }`}
          aria-label={alert.active ? 'Pasif yap' : 'Aktif yap'}
        >
          {alert.active ? 'Aktif' : 'Pasif'}
        </button>
        <button
          onClick={onDelete}
          className="text-[hsl(var(--muted-foreground))] hover:text-red-500"
          aria-label="Limit sil"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
        <div
          className={`h-full transition-all ${
            level === 'OVER'
              ? 'bg-rose-500'
              : level === 'WARNING'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(100, utilPct)}%` }}
        />
        {/* Warning threshold marker */}
        <div
          className="absolute top-0 h-full w-px bg-amber-700/50"
          style={{ left: `${Math.round(alert.warnThresholdPct * 100)}%` }}
          aria-label="Uyarı eşiği"
        />
      </div>
    </li>
  );
}

function LevelBadge({ level }: { level: CategorySpendingAlertLevel }) {
  if (level === 'OVER') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
        <AlertTriangle size={10} /> AŞILDI
      </span>
    );
  }
  if (level === 'WARNING') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
        <AlertCircle size={10} /> YAKLAŞIYOR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
      İYİ
    </span>
  );
}

interface PickerProps {
  available: SpendingCategory[];
  onSubmit: (category: SpendingCategory, monthlyLimit: number) => void;
  onCancel: () => void;
  pending: boolean;
}

function PickerForm({ available, onSubmit, onCancel, pending }: PickerProps) {
  const [selected, setSelected] = useState<SpendingCategory | null>(null);
  const [limitInput, setLimitInput] = useState('1000');

  const limit = Number.parseFloat(limitInput);
  const canSubmit = Boolean(selected) && Number.isFinite(limit) && limit > 0;

  return (
    <div className="ny-card mt-2 space-y-3 !p-4">
      <div>
        <div className="mb-2 text-xs opacity-60">Kategori</div>
        <div className="flex flex-wrap gap-2">
          {available.map((c) => {
            const isActive = selected === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelected(c)}
                className={`ny-chip ${isActive ? 'border-primary text-primary' : ''}`}
                aria-label={`${CATEGORY_LABEL[c].label} seç`}
              >
                {CATEGORY_LABEL[c].icon} {CATEGORY_LABEL[c].label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs opacity-60" htmlFor="limit-input">
          Aylık limit (₺)
        </label>
        <input
          id="limit-input"
          type="number"
          min={1}
          step={50}
          value={limitInput}
          onChange={(e) => setLimitInput(e.target.value)}
          className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          aria-label="Aylık limit tutarı"
        />
      </div>

      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        <button type="button" onClick={onCancel} className="ny-pill-ghost" aria-label="Vazgeç">
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => selected && onSubmit(selected, limit)}
          disabled={!canSubmit || pending}
          className="ny-pill flex-1 disabled:opacity-50"
          aria-label="Limit ekle"
        >
          {pending ? 'Ekleniyor…' : 'Limit ekle'}
        </button>
      </div>
    </div>
  );
}
