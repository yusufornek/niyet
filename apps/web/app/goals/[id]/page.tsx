'use client';

import { AlertTriangle, Check, Sparkles } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import { PhoneShell } from '@/components/phone-shell';
import { fmt, useApp } from '@/lib/stores/use-app';

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const goals = useApp((s) => s.goals);
  const updateGoal = useApp((s) => s.updateGoal);
  const goal = goals.find((g) => g.id === params.id);

  if (!goal) {
    return (
      <PhoneShell title="Hedef" back>
        <p className="ny-tagline">Henüz hedef yok.</p>
      </PhoneShell>
    );
  }

  const base = goal.basePrice ?? goal.target;
  const currentPrice = goal.currentPrice ?? goal.target;
  const inflation = goal.inflationPct ?? 28;
  const monthly = goal.monthlyContribution ?? 1000;
  const history = goal.priceHistory ?? [base, currentPrice];
  const drift = Math.round(((currentPrice - base) / base) * 100);
  const remaining = Math.max(0, currentPrice - goal.current);
  const monthsToGoal = Math.ceil(remaining / Math.max(1, monthly));
  const eta = new Date();
  eta.setMonth(eta.getMonth() + monthsToGoal);
  const etaLabel = eta.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
  const pct = Math.min(100, (goal.current / currentPrice) * 100);

  // Sparkline
  const w = 280;
  const h = 60;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = max - min || 1;
  const pts = history
    .map((v, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const scenarios = [
    { label: 'Mevcut plan', monthly, eta: monthsToGoal },
    {
      label: '+%20 katkı',
      monthly: Math.round(monthly * 1.2),
      eta: Math.ceil(remaining / (monthly * 1.2)),
    },
    { label: 'Hızlı (2x)', monthly: monthly * 2, eta: Math.ceil(remaining / (monthly * 2)) },
  ];

  return (
    <PhoneShell title={goal.name} back>
      {/* Price alert */}
      {drift >= 5 && (
        <div className="ny-card mb-4 border-amber-300/60 bg-amber-50">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 text-amber-600" />
            <div>
              <div className="text-sm font-semibold text-amber-900">Hedefin fiyatı arttı</div>
              <p className="mt-1 text-xs text-amber-800">
                {fmt(base)} → <b>{fmt(currentPrice)}</b> (+%{drift}).{' '}
                {goal.autoUpdate
                  ? 'Tasarruf planın otomatik güncellendi.'
                  : 'Planı güncellemek ister misin?'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="ny-tile-dark mb-4">
        <div className="ny-eyebrow text-white/60">İlerleme</div>
        <div className="mt-2 flex items-end gap-2">
          <div className="text-3xl font-semibold tracking-tight">{fmt(goal.current)}</div>
          <div className="mb-1 text-sm text-white/60">/ {fmt(currentPrice)}</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-[hsl(var(--primary-on-dark))]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-white/70">
          <span>%{Math.round(pct)} tamamlandı</span>
          <span>Tahmini: {etaLabel}</span>
        </div>
      </div>

      {/* Price tracker */}
      <div className="ny-card mb-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="ny-eyebrow">Güncel fiyat</div>
            <div className="mt-1 text-lg font-semibold">{fmt(currentPrice)}</div>
          </div>
          <div className={`text-sm font-semibold ${drift > 0 ? 'text-amber-600' : 'text-primary'}`}>
            {drift > 0 ? '+' : ''}%{drift}
          </div>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full">
          <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2" points={pts} />
        </svg>
        <div className="mt-1 text-xs opacity-60">Son 7 ay fiyat değişimi</div>
      </div>

      {/* Inflation */}
      <div className="ny-card mb-4">
        <div className="flex items-center justify-between">
          <div className="ny-eyebrow">Beklenen yıllık enflasyon</div>
          <div className="text-sm font-semibold">%{inflation}</div>
        </div>
        <input
          type="range"
          min={0}
          max={80}
          value={inflation}
          onChange={(e) => updateGoal(goal.id, { inflationPct: +e.target.value })}
          className="mt-3 w-full accent-[hsl(var(--primary))]"
        />
        <div className="mt-1 text-xs opacity-60">
          Hedef değeri yıllık %{inflation} artışla yeniden hesaplanır.
        </div>
      </div>

      {/* ETA + scenarios */}
      <div className="ny-card mb-4">
        <div className="ny-eyebrow mb-3">Tasarruf senaryoları</div>
        <div className="space-y-2">
          {scenarios.map((s, i) => (
            <button
              key={s.label}
              onClick={() => updateGoal(goal.id, { monthlyContribution: s.monthly })}
              className={`flex w-full items-center justify-between rounded-xl border p-3 ${
                s.monthly === monthly
                  ? 'border-primary bg-primary/5'
                  : 'border-[hsl(var(--hairline))]'
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs opacity-60">{fmt(s.monthly)} / ay</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{s.eta} ay</div>
                <div className="text-xs opacity-60">
                  {i === 0 ? 'tahmini' : `${monthsToGoal - s.eta} ay erken`}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Checkpoints */}
      <div className="ny-card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="ny-eyebrow">Checkpoint bildirimleri</div>
          <span className="text-xs opacity-60">
            {goal.checkpoints?.filter((c) => pct >= c.pct).length ?? 0} ulaşıldı
          </span>
        </div>
        <div className="space-y-2">
          {(goal.checkpoints ?? []).map((c) => {
            const reached = pct >= c.pct;
            return (
              <div key={c.pct} className="flex items-center gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    reached ? 'bg-primary text-white' : 'bg-[hsl(var(--divider-soft))]'
                  }`}
                >
                  {reached ? (
                    <Check size={14} />
                  ) : (
                    <span className="text-[10px] font-semibold">%{c.pct}</span>
                  )}
                </div>
                <div className="flex-1 text-sm">{c.label}</div>
                <div className="text-xs opacity-60">{reached ? 'bildirildi' : 'bekliyor'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-update */}
      <div className="ny-card mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Tasarruf planını otomatik güncelle</div>
          <p className="mt-1 text-xs opacity-60">
            Fiyat değişince aylık katkın yeniden hesaplanır.
          </p>
        </div>
        <button
          onClick={() => updateGoal(goal.id, { autoUpdate: !goal.autoUpdate })}
          className={`relative h-7 w-12 rounded-full transition ${
            goal.autoUpdate ? 'bg-primary' : 'bg-[hsl(var(--divider-soft))]'
          }`}
          aria-label="Otomatik güncelle"
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              goal.autoUpdate ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* AI Coach */}
      <button
        onClick={() => {
          updateGoal(goal.id, { coachContext: goal.name });
          router.push('/chatbot');
        }}
        className="ny-pill flex w-full items-center justify-center gap-2"
      >
        <Sparkles size={16} /> AI Tasarruf Koçu ile konuş
      </button>
    </PhoneShell>
  );
}
