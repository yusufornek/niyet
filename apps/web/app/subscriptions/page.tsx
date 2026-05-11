'use client';

import { AlertTriangle, Check, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import {
  useCancelSubscription,
  useMarkSubscriptionStatus,
  useSubscriptions,
  useSubscriptionSummary,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export default function SubscriptionsPage() {
  const { data, isLoading } = useSubscriptions();
  const { data: sumData } = useSubscriptionSummary();
  const markStatus = useMarkSubscriptionStatus();
  const cancelSub = useCancelSubscription();
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const subs = data?.subscriptions ?? [];
  const sum = sumData?.subscriptionSummary;

  const active = subs.filter((s) => s.status === 'ACTIVE');
  const cancellable = subs.filter((s) => s.status === 'CANCELLABLE');
  const canceled = subs.filter((s) => s.status === 'CANCELED');

  const targetSub = confirmCancelId ? subs.find((s) => s.id === confirmCancelId) : null;

  return (
    <PhoneShell title="Abonelikler" back>
      <p className="ny-tagline mb-4">
        Düzenli ödemelerini gözden geçir, kullanmadığını iptal et — tasarrufu emekliliğine aktar.
      </p>

      <div className="ny-tile-dark mb-4">
        <div className="text-xs uppercase tracking-wider text-white/60">
          Aktif abonelik maliyeti
        </div>
        <div className="ny-tight mt-1 text-3xl font-semibold">
          {formatTRY(sum?.activeMonthlyTotal ?? 0)}
          <span className="text-base text-white/60"> /ay</span>
        </div>
        <div className="mt-1 text-sm text-white/60">
          Yıllık {formatTRY(sum?.activeYearlyTotal ?? 0)} · {sum?.activeCount ?? 0} aktif
        </div>

        {(sum?.cancellableCount ?? 0) > 0 && (
          <div className="mt-3 rounded-lg border border-[hsl(var(--primary-on-dark))]/30 bg-white/5 p-3">
            <div className="flex items-start gap-2 text-[hsl(var(--primary-on-dark))]">
              <Sparkles size={14} className="mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold">İptal edilebilir potansiyel</div>
                <div className="mt-1 text-xs">
                  {sum?.cancellableCount} abonelik · Aylık{' '}
                  {formatTRY(sum?.potentialMonthlySavings ?? 0)} · Yıllık{' '}
                  <b>{formatTRY(sum?.potentialYearlySavings ?? 0)}</b> tasarruf
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ny-card h-20 animate-pulse" />
          ))}
        </div>
      ) : subs.length === 0 ? (
        <div className="ny-card text-center">
          <p className="ny-tagline">Henüz abonelik tespit edilmedi.</p>
          <Link href="/radar" className="ny-pill mt-4 inline-block">
            AI analizi tetikle
          </Link>
        </div>
      ) : (
        <>
          {cancellable.length > 0 && (
            <Section
              title="İptal adayları"
              hint="Kullanmadığını işaretlediklerin. İptal et, yıllık tutar emekliliğine aktarılır."
            >
              {cancellable.map((s) => (
                <SubscriptionRow
                  key={s.id}
                  sub={s}
                  onMarkActive={() => markStatus.mutate({ id: s.id, status: 'ACTIVE' })}
                  onCancel={() => setConfirmCancelId(s.id)}
                  pending={markStatus.isPending || cancelSub.isPending}
                />
              ))}
            </Section>
          )}

          {active.length > 0 && (
            <Section title="Kullandıkların">
              {active.map((s) => (
                <SubscriptionRow
                  key={s.id}
                  sub={s}
                  onMarkCancellable={() => markStatus.mutate({ id: s.id, status: 'CANCELLABLE' })}
                  pending={markStatus.isPending}
                />
              ))}
            </Section>
          )}

          {canceled.length > 0 && (
            <Section title="İptal edilenler">
              {canceled.map((s) => (
                <div key={s.id} className="ny-card opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs opacity-60">
                        Aylık {formatTRY(s.amount)} · İptal edildi
                      </div>
                    </div>
                    <Check size={18} className="text-primary" />
                  </div>
                </div>
              ))}
            </Section>
          )}
        </>
      )}

      {targetSub && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full rounded-t-3xl bg-[hsl(var(--canvas))] p-6 sm:max-w-sm sm:rounded-3xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="mt-0.5 text-amber-600" />
              <div className="flex-1">
                <div className="text-lg font-semibold">{targetSub.name}&apos;u iptal et?</div>
                <p className="mt-2 text-sm opacity-70">
                  Yıllık <b className="text-primary">{formatTRY(targetSub.yearlyAmount)}</b>{' '}
                  tasarrufun emeklilik katkına aktarılacak.
                </p>
                <p className="mt-1 text-xs opacity-50">
                  Bu Niyet&apos;te bir kayıt — gerçek abonelik servisini de iptal etmen gerekir.
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmCancelId(null)} className="ny-pill-ghost flex-1">
                Vazgeç
              </button>
              <button
                onClick={() => {
                  cancelSub.mutate(
                    { id: targetSub.id },
                    { onSuccess: () => setConfirmCancelId(null) },
                  );
                }}
                disabled={cancelSub.isPending}
                className="ny-pill flex-1 disabled:opacity-50"
              >
                {cancelSub.isPending ? 'İptal ediliyor…' : 'İptal et + aktar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href="/contributions" className="text-primary mt-5 block w-full text-center text-sm">
        Katkılarımı gör →
      </Link>
    </PhoneShell>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="ny-eyebrow mb-1">{title}</div>
      {hint && <p className="mb-2 text-xs opacity-60">{hint}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SubscriptionRow({
  sub,
  onMarkActive,
  onMarkCancellable,
  onCancel,
  pending,
}: {
  sub: { id: string; name: string; amount: number; yearlyAmount: number };
  onMarkActive?: () => void;
  onMarkCancellable?: () => void;
  onCancel?: () => void;
  pending?: boolean;
}) {
  return (
    <div className="ny-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{sub.name}</div>
          <div className="text-xs opacity-60">
            Aylık {formatTRY(sub.amount)} · Yıllık {formatTRY(sub.yearlyAmount)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={pending}
            className="ny-pill-sm flex-1 !py-1.5 !text-xs disabled:opacity-50"
          >
            İptal et (+{formatTRY(sub.yearlyAmount)})
          </button>
        )}
        {onMarkActive && (
          <button
            onClick={onMarkActive}
            disabled={pending}
            className="ny-chip flex-1 justify-center !text-xs disabled:opacity-50"
          >
            <X size={11} className="mr-1" /> Aslında kullanıyorum
          </button>
        )}
        {onMarkCancellable && (
          <button
            onClick={onMarkCancellable}
            disabled={pending}
            className="ny-chip flex-1 justify-center !text-xs disabled:opacity-50"
          >
            Kullanmıyorum
          </button>
        )}
      </div>
    </div>
  );
}
