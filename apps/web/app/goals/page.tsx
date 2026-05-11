'use client';

import { TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { fmt, useApp } from '@/lib/stores/use-app';

export default function GoalsPage() {
  const router = useRouter();
  const goals = useApp((s) => s.goals);
  const addGoal = useApp((s) => s.addGoal);
  const selectGoal = useApp((s) => s.selectGoal);
  const [name, setName] = useState('');
  const [target, setTarget] = useState(50000);
  const [date, setDate] = useState('2030');

  const open = (id: string) => {
    selectGoal(id);
    router.push(`/goals/${id}`);
  };

  return (
    <PhoneShell title="Hedefler">
      <div className="mb-5 space-y-3">
        {goals.map((g) => {
          const pct = Math.min(100, (g.current / g.target) * 100);
          const drift =
            g.currentPrice && g.basePrice
              ? Math.round(((g.currentPrice - g.basePrice) / g.basePrice) * 100)
              : 0;
          return (
            <button key={g.id} onClick={() => open(g.id)} className="ny-card w-full text-left">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{g.name}</div>
                <div className="text-xs opacity-60">{g.date}</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
                <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="opacity-60">
                  {fmt(g.current)} / {fmt(g.currentPrice ?? g.target)}
                </span>
                {drift > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <TrendingUp size={12} /> +%{drift} fiyat
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="ny-card">
        <div className="ny-eyebrow mb-3">Yeni hedef</div>
        <div className="mb-3 flex flex-wrap gap-2">
          {['Emeklilik', 'Eğitim', 'Ev peşinatı', 'Araç', 'Tatil', 'Özel'].map((p) => (
            <button
              key={p}
              onClick={() => setName(p)}
              className={`ny-chip ${name === p ? 'border-primary text-primary' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hedef adı"
          className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />
        <label className="mb-1 block text-xs opacity-60">Hedef tutar (₺)</label>
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(+e.target.value)}
          placeholder="Hedef tutar"
          className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />
        <label className="mb-1 block text-xs opacity-60">Hedef yılı</label>
        <input
          type="number"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="2030"
          className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />
        <button
          onClick={() => {
            if (name) {
              const id = addGoal({ name, target, date });
              setName('');
              selectGoal(id);
              router.push(`/goals/${id}`);
            }
          }}
          className="ny-pill w-full"
        >
          Hedef oluştur
        </button>
      </div>

      <Link href="/funds" className="text-primary mt-5 block w-full text-center text-sm">
        Fon seçeneklerini incele →
      </Link>
    </PhoneShell>
  );
}
