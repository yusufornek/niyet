'use client';

import { Check, Sparkles, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import {
  useAcceptCategoryContribution,
  useAcceptTransactionContribution,
  useCategoryBreakdown,
  useEditTransactionCategory,
  useTransactions,
  type SpendingCategory,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

const CATEGORY_META: Record<SpendingCategory, { label: string; icon: string }> = {
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

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as SpendingCategory[];

export default function CategoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const category = (params.id?.toUpperCase() as SpendingCategory) ?? 'OTHER';
  const meta = CATEGORY_META[category];

  const { data: breakdownData } = useCategoryBreakdown('LAST_30D');
  const { data: txData, isLoading } = useTransactions('LAST_30D', 100);
  const acceptTx = useAcceptTransactionContribution();
  const acceptCat = useAcceptCategoryContribution();
  const editCategory = useEditTransactionCategory();

  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  const categoryStats = breakdownData?.categoryBreakdown.find((c) => c.category === category);
  const txs = useMemo(
    () => (txData?.transactions ?? []).filter((t) => t.category === category),
    [txData, category],
  );

  const reducibleTxs = txs.filter((t) => t.isReducible && t.opportunity != null);
  const pendingReducible = reducibleTxs.filter((t) => !t.isAccepted);
  const totalPendingOpportunity = pendingReducible.reduce((s, t) => s + (t.opportunity ?? 0), 0);

  if (!meta) {
    return (
      <PhoneShell title="Kategori" back>
        <p className="ny-tagline">Kategori bulunamadı.</p>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell title={meta.label} back>
      <div className="ny-tile-dark mb-4">
        <div className="text-xs uppercase tracking-wider text-white/60">Son 30 gün</div>
        <div className="ny-tight mt-1 flex items-end gap-2 text-4xl font-semibold">
          <span>{meta.icon}</span>
          <span>{formatTRY(categoryStats?.total ?? 0)}</span>
        </div>
        <div className="mt-1 text-sm text-white/60">
          {categoryStats?.count ?? 0} işlem · Ortalama {formatTRY(categoryStats?.avg ?? 0)}
        </div>
        {(categoryStats?.opportunity ?? 0) > 0 && (
          <div className="mt-3 rounded-lg bg-[hsl(var(--primary-on-dark))]/20 p-2 text-xs text-[hsl(var(--primary-on-dark))]">
            +{formatTRY(categoryStats?.opportunity ?? 0)} tasarruf fırsatı tespit edildi
          </div>
        )}
      </div>

      {pendingReducible.length > 0 && (
        <button
          onClick={() => acceptCat.mutate({ category })}
          disabled={acceptCat.isPending}
          className="ny-pill mb-4 flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles size={16} />
          {acceptCat.isPending
            ? 'Aktarılıyor…'
            : `Tüm fırsatları aktar (+${formatTRY(totalPendingOpportunity)})`}
        </button>
      )}

      <div className="ny-eyebrow mb-2">İşlemler ({txs.length})</div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ny-card h-20 animate-pulse" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <p className="ny-tagline">Bu kategoride son 30 günde işlem yok.</p>
      ) : (
        <div className="space-y-2">
          {txs.map((tx) => {
            const date = new Date(tx.occurredAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            });
            return (
              <div key={tx.id} className="ny-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{tx.merchant}</div>
                    <div className="mt-0.5 text-xs opacity-60">
                      {date} · {formatTRY(tx.amount)}
                      {tx.isRecurring && (
                        <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                          Abonelik
                        </span>
                      )}
                    </div>
                  </div>
                  {tx.isAccepted ? (
                    <div className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold">
                      <Check size={12} /> Aktarıldı
                    </div>
                  ) : tx.isReducible && tx.opportunity != null && tx.opportunity > 0 ? (
                    <button
                      onClick={() => acceptTx.mutate({ transactionId: tx.id })}
                      disabled={acceptTx.isPending}
                      className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      +{formatTRY(tx.opportunity)}
                    </button>
                  ) : null}
                </div>

                {/* Kategori düzeltme açılır panel */}
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() => setEditingTxId(editingTxId === tx.id ? null : tx.id)}
                    className="text-primary text-xs opacity-70 hover:opacity-100"
                  >
                    {editingTxId === tx.id ? 'Kapat' : 'Yanlış kategori mi?'}
                  </button>
                  {tx.categoryEdited && (
                    <span className="text-[10px] opacity-50">Kullanıcı düzeltti</span>
                  )}
                </div>
                {editingTxId === tx.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ALL_CATEGORIES.filter((c) => c !== category).map((c) => {
                      const cm = CATEGORY_META[c];
                      return (
                        <button
                          key={c}
                          onClick={() => {
                            editCategory.mutate(
                              { id: tx.id, category: c },
                              {
                                onSuccess: () => setEditingTxId(null),
                              },
                            );
                          }}
                          disabled={editCategory.isPending}
                          className="ny-chip text-xs disabled:opacity-50"
                        >
                          {cm.icon} {cm.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setEditingTxId(null)}
                      className="ny-chip text-xs"
                      aria-label="Kapat"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button onClick={() => router.push('/radar')} className="ny-pill-ghost text-xs">
          Kategoriler
        </button>
        <button onClick={() => router.push('/transactions')} className="ny-pill-ghost text-xs">
          Tüm işlemler
        </button>
        <button onClick={() => router.push('/contributions')} className="ny-pill-ghost text-xs">
          Katkılarım
        </button>
      </div>
    </PhoneShell>
  );
}
