'use client';

import { TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { useCreateGoal, useGoals } from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export default function GoalsPage() {
  const router = useRouter();
  const { data, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const [name, setName] = useState('');
  const [target, setTarget] = useState(50000);
  const [year, setYear] = useState('2030');

  const goals = data?.goals ?? [];

  const handleCreate = async () => {
    if (!name) return;
    const targetDate = new Date(`${year}-12-31T00:00:00.000Z`).toISOString();
    const result = await createGoal.mutateAsync({
      name,
      basePrice: target,
      targetDate,
      inflationPct: 28,
      monthlyContribution: Math.max(250, Math.round(target / 120)),
    });
    setName('');
    router.push(`/goals/${result.createGoal.id}`);
  };

  return (
    <PhoneShell title="Hedefler">
      {isLoading ? (
        <div className="mb-5 space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="ny-card h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mb-5 space-y-3">
          {goals.map((g) => {
            const pct = Math.min(100, (g.current / g.currentPrice) * 100);
            const drift = Math.round(((g.currentPrice - g.basePrice) / g.basePrice) * 100);
            return (
              <Link key={g.id} href={`/goals/${g.id}`} className="ny-card block w-full text-left">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-xs opacity-60">{new Date(g.targetDate).getFullYear()}</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
                  <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="opacity-60">
                    {formatTRY(g.current)} / {formatTRY(g.currentPrice)}
                  </span>
                  {drift > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <TrendingUp size={12} /> +%{drift} fiyat
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

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
          className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />
        <label className="mb-1 block text-xs opacity-60">Hedef yılı</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={!name || createGoal.isPending}
          className="ny-pill w-full disabled:opacity-50"
        >
          {createGoal.isPending ? 'Oluşturuluyor…' : 'Hedef oluştur'}
        </button>
      </div>

      <Link href="/funds" className="text-primary mt-5 block w-full text-center text-sm">
        Fon seçeneklerini incele →
      </Link>
    </PhoneShell>
  );
}
