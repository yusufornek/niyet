'use client';

/**
 * Monthly Contribution Target Widget
 *
 * Dashboard'da kullanicinin "bu ay X TL katki yapacagim" hedefini gosterir;
 * canli bar + edit form + "simdi degerlendir" butonu.
 *
 * Akis:
 * - Hedef yoksa: "Aylik hedef belirle" CTA + form (target tutari).
 * - Hedef varsa: ilerleme bari (yesil/sari/yesil-vurgu) + tutarlar + edit.
 * - "Simdi degerlendir" → esik gectiyse Notification + toast.
 */
import { Pencil, Play, Target, Trophy, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  useDeleteMyMonthlyTarget,
  useEvaluateMyMonthlyTarget,
  useMyMonthlyContributionTarget,
  usePreviewMyMonthlyTarget,
  useUpsertMyMonthlyTarget,
  type MonthlyTargetLevel,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export function MonthlyTargetWidget() {
  const { data: target, isLoading } = useMyMonthlyContributionTarget();
  const upsert = useUpsertMyMonthlyTarget();
  const delTarget = useDeleteMyMonthlyTarget();
  const evaluate = useEvaluateMyMonthlyTarget();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <section className="ny-card mb-3 !p-4">
        <div className="h-16 animate-pulse rounded-lg bg-[hsl(var(--divider-soft))]" />
      </section>
    );
  }

  // Hedef yok → CTA + form
  if (!target || editing) {
    return (
      <section className="ny-card mb-3 !p-4">
        <header className="mb-2 flex items-center gap-1.5">
          <Target size={14} className="text-primary" />
          <h3 className="text-sm font-semibold">
            {target ? 'Aylık hedefini güncelle' : 'Aylık katkı hedefi belirle'}
          </h3>
        </header>
        <TargetForm
          initialAmount={target?.targetAmount ?? 1000}
          initialWarn={target?.warnThresholdPct ?? 0.9}
          pending={upsert.isPending}
          onSubmit={(amount, warn) => {
            upsert.mutate(
              { targetAmount: amount, warnThresholdPct: warn },
              { onSuccess: () => setEditing(false) },
            );
          }}
          onCancel={target ? () => setEditing(false) : undefined}
          onDelete={
            target
              ? () => {
                  if (confirm('Aylık hedefi silmek istediğine emin misin?')) {
                    delTarget.mutate(undefined, {
                      onSuccess: () => setEditing(false),
                    });
                  }
                }
              : undefined
          }
        />
      </section>
    );
  }

  return (
    <TargetCard
      target={target}
      onEdit={() => setEditing(true)}
      onEvaluate={() => evaluate.mutate(undefined)}
      evaluating={evaluate.isPending}
    />
  );
}

interface TargetCardProps {
  target: {
    id: string;
    targetAmount: number;
    warnThresholdPct: number;
    active: boolean;
  };
  onEdit: () => void;
  onEvaluate: () => void;
  evaluating: boolean;
}

function TargetCard({ target, onEdit, onEvaluate, evaluating }: TargetCardProps) {
  const { data: preview } = usePreviewMyMonthlyTarget({
    targetAmount: target.targetAmount,
    warnThresholdPct: target.warnThresholdPct,
  });

  const level: MonthlyTargetLevel = preview?.level ?? 'BEHIND';
  const utilPct = Math.min(150, Math.round((preview?.utilizationPct ?? 0) * 100));
  const contributed = preview?.contributedAmount ?? 0;
  const remaining = Math.max(0, preview?.remainingAmount ?? target.targetAmount);

  const barColor =
    level === 'REACHED' ? 'bg-emerald-500' : level === 'NEAR' ? 'bg-amber-500' : 'bg-sky-500';

  return (
    <section className="ny-card mb-3 !p-4">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Target size={14} className="text-primary" />
            <h3 className="text-sm font-semibold">Aylık katkı hedefi</h3>
          </div>
          <p className="mt-0.5 text-[11px] opacity-60">Bu ayki birikim hedefin</p>
        </div>
        <button
          onClick={onEdit}
          className="hover:text-foreground text-[hsl(var(--muted-foreground))]"
          aria-label="Hedefi düzenle"
        >
          <Pencil size={12} />
        </button>
      </header>

      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <span className="text-2xl font-semibold">{formatTRY(contributed)}</span>
          <span className="text-xs opacity-60"> / {formatTRY(target.targetAmount)}</span>
        </div>
        <LevelBadge level={level} />
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, utilPct)}%` }}
        />
        {/* warn threshold marker */}
        <div
          className="absolute top-0 h-full w-px bg-amber-700/60"
          style={{ left: `${Math.round(target.warnThresholdPct * 100)}%` }}
          aria-label="Yaklaşma eşiği"
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] opacity-70">
        <span>%{utilPct}</span>
        {level === 'REACHED' ? (
          <span className="font-semibold text-emerald-700">Hedef tamam ✓</span>
        ) : (
          <span>Kalan: {formatTRY(remaining)}</span>
        )}
      </div>

      <button
        onClick={onEvaluate}
        disabled={evaluating}
        className="ny-pill-ghost mt-3 flex w-full items-center justify-center gap-1.5 !py-1.5 !text-xs disabled:opacity-50"
        aria-label="Şimdi değerlendir"
      >
        <Play size={12} />
        {evaluating ? 'Değerlendiriliyor…' : 'Şimdi değerlendir'}
      </button>
    </section>
  );
}

function LevelBadge({ level }: { level: MonthlyTargetLevel }) {
  if (level === 'REACHED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
        <Trophy size={10} /> ULAŞTI
      </span>
    );
  }
  if (level === 'NEAR') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
        YAKLAŞIYOR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
      DEVAM
    </span>
  );
}

interface TargetFormProps {
  initialAmount: number;
  initialWarn: number;
  pending: boolean;
  onSubmit: (amount: number, warn: number) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

function TargetForm({
  initialAmount,
  initialWarn,
  pending,
  onSubmit,
  onCancel,
  onDelete,
}: TargetFormProps) {
  const [amountInput, setAmountInput] = useState(String(initialAmount));
  const [warnInput, setWarnInput] = useState(String(Math.round(initialWarn * 100)));

  useEffect(() => {
    setAmountInput(String(initialAmount));
    setWarnInput(String(Math.round(initialWarn * 100)));
  }, [initialAmount, initialWarn]);

  const amount = Number.parseFloat(amountInput);
  const warnPct = Number.parseFloat(warnInput);
  const canSubmit = useMemo(
    () =>
      Number.isFinite(amount) &&
      amount > 0 &&
      Number.isFinite(warnPct) &&
      warnPct > 0 &&
      warnPct <= 100,
    [amount, warnPct],
  );

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[11px] font-semibold" htmlFor="monthly-target-amount">
          Aylık hedef (₺)
        </label>
        <input
          id="monthly-target-amount"
          type="number"
          min={1}
          step={50}
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          className="mt-1 w-full rounded-md border border-[hsl(var(--hairline))] bg-white px-2 py-1 text-sm"
          aria-label="Aylık katkı hedefi tutarı"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold" htmlFor="monthly-target-warn">
          Yaklaşma eşiği (%)
        </label>
        <input
          id="monthly-target-warn"
          type="number"
          min={1}
          max={100}
          step={5}
          value={warnInput}
          onChange={(e) => setWarnInput(e.target.value)}
          className="mt-1 w-full rounded-md border border-[hsl(var(--hairline))] bg-white px-2 py-1 text-sm"
          aria-label="Yaklaşma eşiği yüzdesi"
        />
        <p className="mt-1 text-[10px] opacity-60">
          Bu yüzdeye ulaştığında “yaklaşıyorsun” bildirimi alırsın (default %90).
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            onClick={onCancel}
            className="ny-chip flex items-center justify-center gap-1 !py-1 text-xs"
            aria-label="Vazgeç"
          >
            <X size={12} /> Vazgeç
          </button>
        )}
        <button
          onClick={() => onSubmit(amount, warnPct / 100)}
          disabled={!canSubmit || pending}
          className="ny-pill-sm flex-1 !py-1 !text-xs disabled:opacity-50"
          aria-label="Kaydet"
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      {onDelete && (
        <button
          onClick={onDelete}
          className="mt-1 w-full text-center text-[10px] text-red-600 opacity-70 hover:opacity-100"
          aria-label="Hedefi sil"
        >
          Aylık hedefi sil
        </button>
      )}
    </div>
  );
}
