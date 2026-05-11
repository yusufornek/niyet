'use client';

import { Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { fmt, useApp } from '@/lib/stores/use-app';

export default function CirclesPage() {
  const circles = useApp((s) => s.circles);
  const addCircle = useApp((s) => s.addCircle);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState(50000);
  return (
    <PhoneShell
      title="Birikim Çemberleri"
      back
      rightSlot={
        <button onClick={() => setCreating(true)} className="text-primary" aria-label="Yeni çember">
          <Plus size={20} />
        </button>
      }
    >
      <p className="ny-tagline mb-4">Ailen veya topluluğunla ortak hedef.</p>

      <div className="space-y-4">
        {circles.map((c) => {
          const total = c.members.reduce((s, m) => s + m.a, 0);
          const pct = (total / c.target) * 100;
          return (
            <div key={c.id} className="ny-tile-dark">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                <Users size={14} /> {c.name}
              </div>
              <div className="ny-tight mt-2 text-3xl font-semibold">{fmt(total)}</div>
              <div className="mt-1 text-sm text-white/60">Hedef: {fmt(c.target)}</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-[hsl(var(--primary-on-dark))]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-3 space-y-2">
                {c.members.map((m) => (
                  <div key={m.n} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs">
                        {m.n[0]}
                      </div>
                      <span>{m.n}</span>
                    </div>
                    <span className="text-[hsl(var(--primary-on-dark))]">{fmt(m.a)}</span>
                  </div>
                ))}
              </div>
              <button className="ny-pill-sm mt-4">Davet et</button>
            </div>
          );
        })}
      </div>

      {creating && (
        <div className="ny-card mt-5">
          <div className="ny-eyebrow mb-3">Yeni çember</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Çember adı (ör. Tatil 2027)"
            className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          />
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(+e.target.value)}
            placeholder="Hedef tutar"
            className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (name) {
                  addCircle({ name, target });
                  setName('');
                  setCreating(false);
                }
              }}
              className="ny-pill flex-1"
            >
              Oluştur
            </button>
            <button onClick={() => setCreating(false)} className="ny-pill-ghost flex-1">
              İptal
            </button>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}
