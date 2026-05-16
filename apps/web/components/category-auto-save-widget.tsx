'use client';

/**
 * Category Auto-Save Widget
 *
 * Kullaniciya "belirli kategorilerde ortalama-altinda harcadigimda fark otomatik
 * aktarilsin" tercihini sunar. Radar sayfasinda yer alir (kategori listesinin ustunde).
 *
 * Akis:
 * 1) Mevcut kurallari listele.
 * 2) Her kural icin "Simdi hesapla" (TriggerCategoryAutoSaveRule mutation).
 * 3) "Yeni kural ekle" — kategori seciminden olusturur.
 * 4) Topluca "Tum kurallari calistir" butonu.
 */
import { Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  useCategoryAutoSaveRules,
  useCreateCategoryAutoSaveRule,
  useDeleteCategoryAutoSaveRule,
  useRunCategoryAutoSaveForMe,
  useSetCategoryAutoSaveRuleActive,
  useTriggerCategoryAutoSaveRule,
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

const RECOMMENDED_CATEGORIES: SpendingCategory[] = [
  'COFFEE',
  'FOOD_DELIVERY',
  'DINING_OUT',
  'ONLINE_SHOPPING',
  'ENTERTAINMENT',
  'CLOTHING',
];

export function CategoryAutoSaveWidget() {
  const { data: rules, isLoading } = useCategoryAutoSaveRules();
  const createRule = useCreateCategoryAutoSaveRule();
  const deleteRule = useDeleteCategoryAutoSaveRule();
  const setActive = useSetCategoryAutoSaveRuleActive();
  const trigger = useTriggerCategoryAutoSaveRule();
  const runAll = useRunCategoryAutoSaveForMe();
  const [picking, setPicking] = useState(false);

  const activeRules = useMemo(() => rules ?? [], [rules]);
  const usedCategories = useMemo(() => new Set(activeRules.map((r) => r.category)), [activeRules]);
  const availableForRecommend = RECOMMENDED_CATEGORIES.filter((c) => !usedCategories.has(c));

  return (
    <section className="ny-card mb-3 !p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary" />
            <h3 className="text-sm font-semibold">Otomatik fark aktarımı</h3>
          </div>
          <p className="mt-1 text-[11px] leading-tight opacity-60">
            Bir kategoride ortalamanın altında harcadığında, fark otomatik mikro katkıya dönüşür.
          </p>
        </div>
        {activeRules.length > 0 && (
          <button
            onClick={() => runAll.mutate(undefined)}
            disabled={runAll.isPending}
            className="ny-pill-sm flex shrink-0 items-center gap-1 !py-1 !text-[11px] disabled:opacity-50"
            aria-label="Tüm kuralları çalıştır"
          >
            <Play size={11} />
            {runAll.isPending ? '…' : 'Tümünü çalıştır'}
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded-lg bg-[hsl(var(--divider-soft))]" />
          <div className="h-10 animate-pulse rounded-lg bg-[hsl(var(--divider-soft))]" />
        </div>
      ) : activeRules.length === 0 ? (
        <p className="rounded-lg bg-[hsl(var(--divider-soft))] p-3 text-[11px] leading-tight opacity-70">
          Henüz kural yok. Aşağıdan bir kategori seç ve sistem otomatik takibe başlasın.
        </p>
      ) : (
        <ul className="mb-2 space-y-2">
          {activeRules.map((r) => {
            const meta = CATEGORY_LABEL[r.category];
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-lg bg-[hsl(var(--divider-soft))]/40 p-2"
              >
                <span className="text-lg">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{meta.label}</span>
                    <span className="text-[10px] opacity-60">
                      {r.lookbackMonths} aylık ortalama
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] opacity-60">
                    {r.lastTriggeredAt
                      ? `Son: ${r.lastTriggeredMonth} → ${
                          r.lastTransferAmount != null ? formatTRY(r.lastTransferAmount) : '—'
                        }`
                      : 'Henüz tetiklenmedi'}
                  </div>
                </div>
                <button
                  onClick={() => trigger.mutate({ id: r.id })}
                  disabled={trigger.isPending || !r.active}
                  className="ny-pill-sm !py-1 !text-[10px] disabled:opacity-50"
                  aria-label={`${meta.label} için şimdi hesapla`}
                >
                  Hesapla
                </button>
                <button
                  onClick={() => setActive.mutate({ id: r.id, active: !r.active })}
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    r.active
                      ? 'bg-primary/15 text-primary'
                      : 'bg-[hsl(var(--divider-soft))] opacity-60'
                  }`}
                  aria-label={r.active ? 'Kuralı duraklat' : 'Kuralı etkinleştir'}
                >
                  {r.active ? 'Aktif' : 'Pasif'}
                </button>
                <button
                  onClick={() => deleteRule.mutate(r.id)}
                  className="text-[hsl(var(--muted-foreground))] hover:text-red-500"
                  aria-label="Kuralı sil"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!picking && availableForRecommend.length > 0 && (
        <button
          onClick={() => setPicking(true)}
          className="ny-pill-ghost mt-2 flex w-full items-center justify-center gap-1.5 !py-1.5 !text-xs"
          aria-label="Yeni kategori ekle"
        >
          <Plus size={12} /> Yeni kategori ekle
        </button>
      )}

      {picking && (
        <div className="mt-2 rounded-lg bg-[hsl(var(--divider-soft))]/40 p-2">
          <div className="mb-1.5 text-[11px] font-semibold">Önerilen kategoriler</div>
          <div className="flex flex-wrap gap-1.5">
            {availableForRecommend.map((c) => (
              <button
                key={c}
                onClick={() => {
                  createRule.mutate({ category: c });
                  setPicking(false);
                }}
                disabled={createRule.isPending}
                className="ny-chip !py-1 text-[11px] disabled:opacity-50"
                aria-label={`${CATEGORY_LABEL[c].label} ekle`}
              >
                {CATEGORY_LABEL[c].icon} {CATEGORY_LABEL[c].label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPicking(false)}
            className="mt-2 text-[10px] opacity-60 hover:opacity-100"
          >
            Vazgeç
          </button>
        </div>
      )}
    </section>
  );
}
