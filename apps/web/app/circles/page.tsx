'use client';

import { Plus, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { useCircles, useCreateCircle, useJoinCircleByInviteCode } from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export default function CirclesPage() {
  const { data: circles, isLoading } = useCircles();
  const createCircle = useCreateCircle();
  const joinByCode = useJoinCircleByInviteCode();

  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');

  return (
    <PhoneShell title="Birikim Çemberleri" back>
      <p className="ny-tagline mb-3">Ailen veya topluluğunla ortak hedef.</p>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode((m) => (m === 'create' ? 'idle' : 'create'))}
          className={`ny-pill-sm flex items-center justify-center gap-1.5 ${
            mode === 'create' ? '!bg-primary !text-primary-foreground' : ''
          }`}
          aria-label="Yeni çember oluştur"
        >
          <Plus size={14} /> Yeni çember
        </button>
        <button
          onClick={() => setMode((m) => (m === 'join' ? 'idle' : 'join'))}
          className={`ny-pill-sm flex items-center justify-center gap-1.5 ${
            mode === 'join' ? '!bg-primary !text-primary-foreground' : ''
          }`}
          aria-label="Davet koduyla katıl"
        >
          <Sparkles size={14} /> Kod ile katıl
        </button>
      </div>

      {mode === 'create' && (
        <CreateForm
          pending={createCircle.isPending}
          onCancel={() => setMode('idle')}
          onSubmit={(vals) => {
            createCircle.mutate(vals, { onSuccess: () => setMode('idle') });
          }}
        />
      )}

      {mode === 'join' && (
        <JoinForm
          pending={joinByCode.isPending}
          onCancel={() => setMode('idle')}
          onSubmit={(code) => {
            joinByCode.mutate(code, { onSuccess: () => setMode('idle') });
          }}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="ny-tile-dark h-32 animate-pulse" />
          ))}
        </div>
      ) : (circles ?? []).length === 0 ? (
        <p className="ny-tagline mt-4 text-center opacity-70">
          Henüz çember yok. Yukarıdaki butonlardan oluştur veya bir koda katıl.
        </p>
      ) : (
        <div className="space-y-3">
          {(circles ?? []).map((c) => {
            const total = (c.members ?? []).reduce((s, m) => s + m.contribution, 0);
            const pct = c.target > 0 ? Math.min(150, (total / c.target) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/circles/${c.id}` as `/circles/${string}`}
                className="ny-tile-dark block"
                aria-label={`${c.name} çemberini aç`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                    <Users size={14} /> {c.name}
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                    {c.type === 'FAMILY' ? 'Aile' : 'Topluluk'}
                  </span>
                </div>
                <div className="ny-tight mt-2 text-2xl font-semibold">{formatTRY(total)}</div>
                <div className="mt-0.5 text-xs text-white/60">
                  Hedef: {formatTRY(c.target)} · {c.members?.length ?? 0} üye
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[hsl(var(--primary-on-dark))]"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-[11px] text-white/60">%{Math.round(pct)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </PhoneShell>
  );
}

interface CreateProps {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (vals: { name: string; target: number; type: 'FAMILY' | 'COMMUNITY' }) => void;
}

function CreateForm({ pending, onCancel, onSubmit }: CreateProps) {
  const [name, setName] = useState('');
  const [targetInput, setTargetInput] = useState('10000');
  const [type, setType] = useState<'FAMILY' | 'COMMUNITY'>('FAMILY');
  const target = Number.parseFloat(targetInput);
  const canSubmit = name.trim().length > 0 && Number.isFinite(target) && target > 0;

  return (
    <section className="ny-card mb-4 !p-4">
      <h3 className="mb-3 text-sm font-semibold">Yeni çember</h3>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs opacity-60" htmlFor="circle-name">
            Ad
          </label>
          <input
            id="circle-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Örn: Aile birikim çemberi"
            className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
            aria-label="Çember adı"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs opacity-60" htmlFor="circle-target">
            Hedef (₺)
          </label>
          <input
            id="circle-target"
            type="number"
            min={1}
            step={100}
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
            aria-label="Hedef tutar"
          />
        </div>
        <div>
          <span className="mb-1 block text-xs opacity-60">Tür</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('FAMILY')}
              className={`ny-chip ${type === 'FAMILY' ? 'border-primary text-primary' : ''}`}
              aria-label="Aile"
            >
              👨‍👩‍👧 Aile
            </button>
            <button
              type="button"
              onClick={() => setType('COMMUNITY')}
              className={`ny-chip ${type === 'COMMUNITY' ? 'border-primary text-primary' : ''}`}
              aria-label="Topluluk"
            >
              🌍 Topluluk
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button type="button" onClick={onCancel} className="ny-pill-ghost" aria-label="Vazgeç">
            Vazgeç
          </button>
          <button
            type="button"
            disabled={!canSubmit || pending}
            onClick={() => onSubmit({ name: name.trim(), target, type })}
            className="ny-pill flex-1 disabled:opacity-50"
            aria-label="Çember oluştur"
          >
            {pending ? 'Oluşturuluyor…' : 'Çember oluştur'}
          </button>
        </div>
      </div>
    </section>
  );
}

interface JoinProps {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (code: string) => void;
}

function JoinForm({ pending, onCancel, onSubmit }: JoinProps) {
  const [code, setCode] = useState('');
  const canSubmit = code.trim().length >= 6;

  return (
    <section className="ny-card mb-4 space-y-3">
      <div>
        <div className="ny-eyebrow mb-1">Davet kodu ile katıl</div>
        <p className="text-xs opacity-60">
          Bir üye sana 8 karakterli davet kodu paylaştıysa buraya yaz.
        </p>
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={8}
        placeholder="ÖRN: ABCD2345"
        className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-center font-mono text-base tracking-widest"
        aria-label="Davet kodu"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onCancel} className="ny-pill-ghost" aria-label="Vazgeç">
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => onSubmit(code.trim())}
          disabled={!canSubmit || pending}
          className="ny-pill flex-1 disabled:opacity-50"
          aria-label="Katıl"
        >
          {pending ? 'Katılıyor…' : 'Çembere katıl'}
        </button>
      </div>
    </section>
  );
}
