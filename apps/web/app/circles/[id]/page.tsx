'use client';

import { Check, Copy, LogOut, Plus, Trophy, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { Spinner } from '@/components/spinner';
import {
  useCircle,
  useCircleProgress,
  useContributeToCircle,
  useLeaveCircle,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

const MILESTONES = [25, 50, 75, 100] as const;

export default function CircleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: circle, isLoading } = useCircle(id);
  const { data: progress } = useCircleProgress(id);
  const contribute = useContributeToCircle();
  const leave = useLeaveCircle();

  const [contribInput, setContribInput] = useState('100');
  const [codeCopied, setCodeCopied] = useState(false);

  if (isLoading) {
    return (
      <PhoneShell title="Çember" back>
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Yükleniyor" />
        </div>
      </PhoneShell>
    );
  }

  if (!circle) {
    return (
      <PhoneShell title="Çember" back>
        <p className="ny-tagline">Çember bulunamadı veya üye değilsin.</p>
      </PhoneShell>
    );
  }

  const total = progress?.totalContributed ?? 0;
  const progressPct = progress?.progressPct ?? 0;
  const visualPct = Math.min(100, progressPct * 100);
  const remaining = progress?.remainingAmount ?? circle.target - total;
  const contribAmount = Number.parseFloat(contribInput);
  const canContribute = Number.isFinite(contribAmount) && contribAmount > 0;

  const handleCopy = () => {
    if (!circle.inviteCode) return;
    void navigator.clipboard?.writeText(circle.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  return (
    <PhoneShell title={circle.name} back>
      {/* Tile: Hedef + ilerleme */}
      <div className="ny-tile-dark mb-3">
        <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wider text-white/60">
          <span className="flex items-center gap-1.5">
            <Users size={12} /> {progress?.memberCount ?? 0} üye
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
            {circle.type === 'FAMILY' ? 'Aile' : 'Topluluk'}
          </span>
        </div>
        <div className="ny-tight mt-2 text-3xl font-semibold">{formatTRY(total)}</div>
        <div className="mt-0.5 text-sm text-white/60">/ {formatTRY(circle.target)} hedef</div>

        {/* Bar + milestone markers */}
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[hsl(var(--primary-on-dark))] transition-all"
            style={{ width: `${visualPct}%` }}
          />
          {MILESTONES.map((mp) => (
            <div
              key={mp}
              className="absolute top-0 h-full w-px bg-white/30"
              style={{ left: `${mp}%` }}
              aria-label={`Milestone %${mp}`}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-white/60">
          <span>%{Math.round(progressPct * 100)}</span>
          {remaining > 0 ? (
            <span>Kalan: {formatTRY(remaining)}</span>
          ) : (
            <span className="text-[hsl(var(--primary-on-dark))]">Hedef tamam ✓</span>
          )}
        </div>

        {/* Milestone badges */}
        <div className="mt-3 flex gap-1.5">
          {MILESTONES.map((mp) => {
            const reached =
              progress?.highestReachedMilestone != null && progress.highestReachedMilestone >= mp;
            return (
              <span
                key={mp}
                className={`flex-1 rounded-full px-2 py-0.5 text-center text-[10px] font-bold ${
                  reached
                    ? 'bg-[hsl(var(--primary-on-dark))] text-black'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                %{mp}
              </span>
            );
          })}
        </div>
      </div>

      {/* Davet kodu */}
      {circle.inviteCode && (
        <section className="ny-card mb-3">
          <div className="ny-eyebrow mb-2">Davet kodu</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-[hsl(var(--divider-soft))] p-3 text-center font-mono text-base tracking-widest">
              {circle.inviteCode}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="ny-chip flex items-center gap-1"
              aria-label="Davet kodunu kopyala"
            >
              {codeCopied ? <Check size={14} /> : <Copy size={14} />}
              {codeCopied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          <p className="mt-2 text-xs opacity-60">
            Bu kodu paylaş — üye olmak isteyenler ana sayfada “Kod ile katıl” diyebilir.
          </p>
        </section>
      )}

      {/* Katkı yap */}
      <section className="ny-card mb-3">
        <div className="ny-eyebrow mb-2">Bu ay katkımı ekle</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            step={50}
            value={contribInput}
            onChange={(e) => setContribInput(e.target.value)}
            className="flex-1 rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
            aria-label="Katkı tutarı"
          />
          <button
            type="button"
            disabled={!canContribute || contribute.isPending}
            onClick={() => contribute.mutate({ circleId: circle.id, amount: contribAmount })}
            className="ny-pill-sm flex items-center gap-1.5 disabled:opacity-50"
            aria-label="Katkı ekle"
          >
            <Plus size={14} /> {contribute.isPending ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
      </section>

      {/* Lider tablosu */}
      <section className="ny-card mb-3 !p-3">
        <header className="mb-2 flex items-center gap-1.5">
          <Trophy size={12} className="text-amber-600" />
          <h3 className="text-xs font-semibold">Lider tablosu</h3>
        </header>
        {(progress?.leaderboard ?? []).length === 0 ? (
          <p className="text-[11px] opacity-60">Henüz katkı yok.</p>
        ) : (
          <ul className="space-y-1.5">
            {(progress?.leaderboard ?? []).map((entry) => (
              <li
                key={entry.userId}
                className="flex items-center gap-2 rounded-md bg-[hsl(var(--divider-soft))]/40 p-1.5"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold">
                  #{entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{entry.name}</div>
                  <div className="text-[10px] opacity-60">
                    %{Math.round(entry.sharePct * 100)} pay
                  </div>
                </div>
                <span className="text-sm font-semibold">{formatTRY(entry.contribution)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ayrıl */}
      <button
        onClick={() => {
          if (confirm('Bu çemberden ayrılmak istediğine emin misin?')) {
            leave.mutate(circle.id, {
              onSuccess: () => router.push('/circles'),
            });
          }
        }}
        className="ny-pill-ghost flex w-full items-center justify-center gap-1.5 !py-1.5 !text-xs text-red-600"
        aria-label="Çemberden ayrıl"
      >
        <LogOut size={12} /> Çemberden ayrıl
      </button>
    </PhoneShell>
  );
}
