'use client';

import { Check, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { Spinner } from '@/components/spinner';
import {
  useAnalysisRun,
  useEditTransactionCategory,
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

export default function AnalysisDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useAnalysisRun(params.id);
  const run = data?.analysisRun;
  const editCategory = useEditTransactionCategory();
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <PhoneShell title="Analiz detayı" back>
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Yükleniyor" />
        </div>
      </PhoneShell>
    );
  }

  if (!run) {
    return (
      <PhoneShell title="Analiz detayı" back>
        <p className="ny-tagline">Analiz bulunamadı.</p>
      </PhoneShell>
    );
  }

  const date = new Date(run.triggeredAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Bu run'da reducible/subscription/category aksiyonu olan TX'leri ayır
  const reducibleAnalyses = run.transactionAnalyses
    .filter((a) => a.reducibleAmount != null && a.reducibleAmount > 0)
    .sort((a, b) => (b.reducibleAmount ?? 0) - (a.reducibleAmount ?? 0));
  const subscriptionAnalyses = run.transactionAnalyses.filter((a) => a.markedSubscription);
  const categoryAnalyses = run.transactionAnalyses.filter((a) => a.suggestedCategory);

  // Kategori bazlı toplam fırsat
  const categoryTotals = new Map<SpendingCategory, number>();
  for (const a of reducibleAnalyses) {
    const cat = a.transaction.category;
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + (a.reducibleAmount ?? 0));
  }
  const sortedCategories = Array.from(categoryTotals.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <PhoneShell title="Analiz detayı" back>
      <div className="ny-tile-dark mb-4">
        <div className="ny-eyebrow text-white/60">{date}</div>
        <div className="ny-tight mt-2 text-3xl font-semibold text-[hsl(var(--primary-on-dark))]">
          +{formatTRY(run.totalOpportunity)}
        </div>
        <div className="mt-1 text-sm text-white/70">tespit edilen mikro katkı potansiyeli</div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-3 text-xs">
          <div>
            <div className="text-white/50">Model</div>
            <div className="mt-0.5 font-semibold">
              {run.geminiModel.startsWith('stub') ? 'Demo' : 'Gemini'}
            </div>
          </div>
          <div>
            <div className="text-white/50">Süre</div>
            <div className="mt-0.5 font-semibold">
              {run.durationMs < 1000
                ? `${run.durationMs}ms`
                : `${(run.durationMs / 1000).toFixed(1)}s`}
            </div>
          </div>
          <div>
            <div className="text-white/50">İşlem</div>
            <div className="mt-0.5 font-semibold">{run.totalTransactions}</div>
          </div>
        </div>
      </div>

      {sortedCategories.length > 0 && (
        <>
          <div className="ny-eyebrow mb-2">
            En yüksek fırsatlar (kategoriye tıkla, katkıya dönüştür)
          </div>
          <div className="mb-4 space-y-2">
            {sortedCategories.map(([cat, total]) => {
              const meta = CATEGORY_META[cat];
              const pct = run.totalOpportunity > 0 ? (total / run.totalOpportunity) * 100 : 0;
              return (
                <Link
                  key={cat}
                  href={`/category/${cat}`}
                  className="ny-card hover:border-primary/40 block !p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta?.icon}</span>
                      <span className="text-sm font-semibold">{meta?.label}</span>
                    </div>
                    <span className="text-primary text-sm font-semibold">+{formatTRY(total)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
                    <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {reducibleAnalyses.length > 0 && (
        <>
          <div className="ny-eyebrow mb-2">Azaltılabilir işlemler ({reducibleAnalyses.length})</div>
          <div className="mb-4 space-y-2">
            {reducibleAnalyses.map((a) => {
              const meta = CATEGORY_META[a.transaction.category];
              const txDate = new Date(a.transaction.occurredAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
              });
              return (
                <div key={a.id} className="ny-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 items-start gap-2">
                      <span className="mt-0.5 text-lg">{meta?.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{a.transaction.merchant}</div>
                        <div className="mt-0.5 text-xs opacity-60">
                          {txDate} · {meta?.label} · {formatTRY(a.transaction.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary text-sm font-semibold">
                        +{formatTRY(a.reducibleAmount ?? 0)}
                      </div>
                      <div className="text-[10px] opacity-50">fırsat</div>
                    </div>
                  </div>
                  {a.reasoning && (
                    <div className="mt-2 flex gap-2 rounded-lg bg-[hsl(var(--canvas-parchment))] p-2 text-xs">
                      <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
                      <p className="opacity-80">{a.reasoning}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {subscriptionAnalyses.length > 0 && (
        <>
          <div className="ny-eyebrow mb-2">
            Tespit edilen abonelikler ({subscriptionAnalyses.length})
          </div>
          <div className="mb-4 space-y-2">
            {subscriptionAnalyses.map((a) => (
              <div key={a.id} className="ny-card !p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{a.transaction.merchant}</div>
                  <div className="opacity-60">{formatTRY(a.transaction.amount)}</div>
                </div>
                {a.reasoning && <p className="mt-1 text-xs opacity-70">{a.reasoning}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {categoryAnalyses.length > 0 && (
        <>
          <div className="ny-eyebrow mb-2">AI&apos;ın yeniden sınıflandırma önerileri</div>
          <p className="mb-2 text-xs opacity-60">
            AI bu işlemlerin başka kategoride olduğunu düşünüyor. Onayla ya da reddet.
          </p>
          <div className="mb-4 space-y-2">
            {categoryAnalyses.slice(0, 8).map((a) => {
              const oldMeta = CATEGORY_META[a.transaction.category];
              const newMeta = a.suggestedCategory ? CATEGORY_META[a.suggestedCategory] : null;
              // AI önerisi mevcut kategori ile aynıysa veya zaten kullanıcı düzelttiyse skip
              const alreadyApplied = a.transaction.category === a.suggestedCategory;
              const dismissed = dismissedSuggestions.has(a.id);
              if (alreadyApplied || dismissed) return null;
              return (
                <div key={a.id} className="ny-card !p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">{a.transaction.merchant}</div>
                      <div className="mt-1 text-xs">
                        <span className="line-through opacity-50">{oldMeta?.label}</span>{' '}
                        <span className="text-primary">→ {newMeta?.label}</span>
                      </div>
                    </div>
                    <span className="text-xs opacity-60">{formatTRY(a.transaction.amount)}</span>
                  </div>
                  {a.reasoning && <p className="mt-2 text-xs opacity-70">{a.reasoning}</p>}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        if (!a.suggestedCategory) return;
                        editCategory.mutate(
                          { id: a.transaction.id, category: a.suggestedCategory },
                          {
                            onSuccess: () => setDismissedSuggestions((s) => new Set(s).add(a.id)),
                          },
                        );
                      }}
                      disabled={editCategory.isPending}
                      className="ny-pill-sm flex-1 !py-1.5 !text-xs disabled:opacity-50"
                    >
                      <Check size={11} className="mr-1" /> Kabul et
                    </button>
                    <button
                      onClick={() => setDismissedSuggestions((s) => new Set(s).add(a.id))}
                      className="ny-chip !py-1 text-xs"
                      aria-label="Reddet"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {run.transactionAnalyses.length === 0 && (
        <div className="ny-card text-center">
          <p className="ny-tagline">Bu analiz çıktısı boş kaldı.</p>
        </div>
      )}
    </PhoneShell>
  );
}
