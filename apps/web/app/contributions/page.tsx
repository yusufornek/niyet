'use client';

import { Sparkles, Undo2 } from 'lucide-react';
import Link from 'next/link';

import { PhoneShell } from '@/components/phone-shell';
import {
  useContributionSummary,
  useMicroContributions,
  useReverseContribution,
  type ContributionSource,
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

const SOURCE_LABEL: Record<ContributionSource, string> = {
  REDUCIBLE_TRANSACTION: 'Tek işlem',
  CATEGORY_BUCKET: 'Kategori toplu',
  MANUAL: 'Manuel',
  RULE_TRIGGERED: 'Otomatik kural',
};

export default function ContributionsPage() {
  const { data: summary, isLoading: sumLoading } = useContributionSummary();
  const { data: contribs, isLoading } = useMicroContributions({ limit: 100 });
  const reverse = useReverseContribution();

  const items = contribs?.microContributions ?? [];
  const s = summary?.contributionSummary;

  return (
    <PhoneShell title="Mikro Katkılar" back>
      <p className="ny-tagline mb-4">
        Azaltılabilir harcamalardan emeklilik birikimine aktardığın tutarlar.
      </p>

      <div className="ny-tile-dark mb-4">
        <div className="text-xs uppercase tracking-wider text-white/60">Toplam katkı</div>
        <div className="ny-tight mt-1 text-4xl font-semibold">
          {sumLoading ? '…' : formatTRY(s?.totalAccepted ?? 0)}
        </div>
        <div className="mt-1 text-sm text-white/60">
          {s?.count ?? 0} işlem · {formatTRY(s?.last30dAmount ?? 0)} son 30 günde
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
          <div>
            <div className="text-white/50">Aktarıldı (committed)</div>
            <div className="mt-0.5 font-semibold text-[hsl(var(--primary-on-dark))]">
              {formatTRY(s?.totalCommitted ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-white/50">Sıradaki (pending)</div>
            <div className="mt-0.5 font-semibold">{formatTRY(s?.totalPending ?? 0)}</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ny-card h-20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="ny-card text-center">
          <Sparkles size={24} className="text-primary mx-auto mb-2" />
          <p className="ny-tagline">Henüz katkı yok.</p>
          <p className="mt-2 text-xs opacity-60">
            Tasarruf Radarı&apos;ndan azaltılabilir bir harcamayı katkıya dönüştürerek başla.
          </p>
          <Link href="/radar" className="ny-pill mt-4 inline-block">
            Radarı aç
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const meta = c.category ? CATEGORY_META[c.category] : null;
            const date = new Date(c.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            });
            const isReversed = c.status === 'REVERSED';
            return (
              <div key={c.id} className={`ny-card ${isReversed ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-2">
                    <span className="mt-0.5 text-lg">{meta?.icon ?? '💰'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {meta?.label ?? 'Mikro katkı'}
                        {c.transaction && (
                          <span className="ml-2 text-xs opacity-60">
                            ({c.transaction.merchant})
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs opacity-60">
                        {date} · {SOURCE_LABEL[c.source]}
                      </div>
                      {c.goal && <div className="text-primary mt-1 text-xs">→ {c.goal.name}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-primary font-semibold">+{formatTRY(c.amount)}</div>
                    <div className="text-[10px] opacity-50">
                      {c.status === 'COMMITTED' && 'aktarıldı'}
                      {c.status === 'PENDING' && 'sırada'}
                      {c.status === 'REVERSED' && 'geri alındı'}
                    </div>
                  </div>
                </div>
                {!isReversed && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => reverse.mutate(c.id)}
                      disabled={reverse.isPending}
                      className="flex items-center gap-1 text-xs opacity-50 hover:opacity-80 disabled:opacity-30"
                    >
                      <Undo2 size={11} /> Geri al
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PhoneShell>
  );
}
