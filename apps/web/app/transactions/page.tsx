'use client';

import { Check, Pencil, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import {
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

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<SpendingCategory | 'ALL'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useTransactions('LAST_90D', 300);
  const { data: cb } = useCategoryBreakdown('LAST_90D');
  const editCategory = useEditTransactionCategory();

  const txs = data?.transactions ?? [];
  const editedCount = txs.filter((t) => t.categoryEdited).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return txs.filter((t) => {
      if (filterCat !== 'ALL' && t.category !== filterCat) return false;
      if (term && !t.merchant.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [txs, search, filterCat]);

  return (
    <PhoneShell title="İşlemler" back>
      <p className="ny-tagline mb-4">
        Tüm harcamaları gözden geçir. Yanlış kategoriyi düzeltirsen AI öneriler daha doğru çıkar.
      </p>

      <div className="ny-card mb-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="opacity-50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Merchant ara (Starbucks, Migros…)"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Aramayı temizle">
              <X size={14} className="opacity-50" />
            </button>
          )}
        </div>
      </div>

      <div className="ny-eyebrow mb-2">Kategori filtresi</div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat('ALL')}
          className={`ny-chip text-xs ${filterCat === 'ALL' ? 'border-primary text-primary' : ''}`}
        >
          Hepsi ({txs.length})
        </button>
        {ALL_CATEGORIES.filter((c) =>
          (cb?.categoryBreakdown ?? []).some((x) => x.category === c),
        ).map((c) => {
          const meta = CATEGORY_META[c];
          const count = cb?.categoryBreakdown.find((x) => x.category === c)?.count ?? 0;
          return (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`ny-chip text-xs ${filterCat === c ? 'border-primary text-primary' : ''}`}
            >
              {meta.icon} {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {editedCount > 0 && (
        <div className="ny-card border-primary/30 bg-primary/5 mb-3">
          <div className="flex items-start gap-2">
            <Pencil size={16} className="text-primary mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold">{editedCount} işlemde kategori düzeltildi.</span>{' '}
              <span className="opacity-70">
                Bir sonraki AI analizinde bu düzeltmeler dikkate alınacak.
              </span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ny-card h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ny-card text-center">
          <p className="ny-tagline">İşlem bulunamadı.</p>
          <p className="mt-2 text-xs opacity-60">Filtreleri temizle veya farklı kategori seç.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="ny-eyebrow mb-1">{filtered.length} işlem gösteriliyor (son 90 gün)</div>
          {filtered.map((tx) => {
            const meta = CATEGORY_META[tx.category];
            const date = new Date(tx.occurredAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            });
            const isEditing = editingId === tx.id;
            return (
              <div key={tx.id} className="ny-card">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xl">{meta.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-semibold">{tx.merchant}</div>
                      <div className="text-sm font-semibold">{formatTRY(tx.amount)}</div>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs opacity-60">
                      <span>{date}</span>
                      <span>·</span>
                      <span>{meta.label}</span>
                      {tx.categoryEdited && (
                        <>
                          <span>·</span>
                          <span className="text-primary flex items-center gap-0.5 font-semibold">
                            <Check size={10} /> Düzeltildi
                          </span>
                        </>
                      )}
                      {tx.isRecurring && (
                        <span className="rounded bg-violet-100 px-1 text-[10px] font-semibold text-violet-700">
                          Abonelik
                        </span>
                      )}
                      {tx.isReducible && (
                        <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                          Azaltılabilir
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() => setEditingId(isEditing ? null : tx.id)}
                    className="text-primary flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
                  >
                    <Pencil size={11} /> {isEditing ? 'Kapat' : 'Kategoriyi düzelt'}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-3 border-t border-[hsl(var(--hairline))] pt-3">
                    <div className="mb-2 text-xs opacity-70">
                      Bu işlem hangi kategoriye ait olmalı?
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_CATEGORIES.filter((c) => c !== tx.category).map((c) => {
                        const cm = CATEGORY_META[c];
                        return (
                          <button
                            key={c}
                            onClick={() => {
                              editCategory.mutate(
                                { id: tx.id, category: c },
                                { onSuccess: () => setEditingId(null) },
                              );
                            }}
                            disabled={editCategory.isPending}
                            className="ny-chip text-xs disabled:opacity-50"
                          >
                            {cm.icon} {cm.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link href="/radar" className="text-primary mt-5 block w-full text-center text-sm">
        Kategori dağılımına dön →
      </Link>
    </PhoneShell>
  );
}
