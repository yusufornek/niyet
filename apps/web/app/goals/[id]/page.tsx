'use client';

import { AlertTriangle, Check, RefreshCw, Sparkles } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import { PhoneShell } from '@/components/phone-shell';
import {
  useGoal,
  useGoalPriceAlerts,
  useMarkGoalPriceAlertRead,
  useRefreshGoalTrackedPrice,
  useUpdateGoal,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useGoal(params.id);
  const { data: alertsData } = useGoalPriceAlerts(true);
  const updateGoal = useUpdateGoal();
  const refreshPrice = useRefreshGoalTrackedPrice();
  const markAlertRead = useMarkGoalPriceAlertRead();

  if (isLoading) {
    return (
      <PhoneShell title="Hedef" back>
        <div className="ny-card h-32 animate-pulse" />
      </PhoneShell>
    );
  }

  const goal = data?.goal;
  if (!goal) {
    return (
      <PhoneShell title="Hedef" back>
        <p className="ny-tagline">Hedef bulunamadı.</p>
      </PhoneShell>
    );
  }

  const base = goal.basePrice;
  const currentPrice = goal.currentPrice;
  const inflation = goal.inflationPct;
  const monthly = goal.monthlyContribution;
  const history = goal.priceHistory ?? [
    { date: '', price: base },
    { date: '', price: currentPrice },
  ];
  const drift = Math.round(((currentPrice - base) / base) * 100);
  const remaining = Math.max(0, currentPrice - goal.current);
  const monthsToGoal = monthly > 0 ? Math.ceil(remaining / monthly) : 999;
  const eta = new Date();
  eta.setMonth(eta.getMonth() + monthsToGoal);
  const etaLabel = eta.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
  const pct = Math.min(100, (goal.current / currentPrice) * 100);
  const alerts = (alertsData?.goalPriceAlerts ?? []).filter((alert) => alert.goalId === goal.id);

  const w = 280;
  const h = 60;
  const prices = history.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pts = prices
    .map((v, i) => {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const scenarios = [
    { label: 'Mevcut plan', monthly, eta: monthsToGoal },
    {
      label: '+%20 katkı',
      monthly: Math.round(monthly * 1.2),
      eta: Math.ceil(remaining / Math.max(1, monthly * 1.2)),
    },
    {
      label: 'Hızlı (2x)',
      monthly: monthly * 2,
      eta: Math.ceil(remaining / Math.max(1, monthly * 2)),
    },
  ];

  return (
    <PhoneShell title={goal.name} back>
      {drift >= 5 && (
        <div className="ny-card mb-4 border-amber-300/60 bg-amber-50">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 text-amber-600" />
            <div>
              <div className="text-sm font-semibold text-amber-900">Hedefin fiyatı arttı</div>
              <p className="mt-1 text-xs text-amber-800">
                {formatTRY(base)} → <b>{formatTRY(currentPrice)}</b> (+%{drift}).{' '}
                {goal.autoUpdate
                  ? 'Tasarruf planın otomatik güncellendi.'
                  : 'Planı güncellemek ister misin?'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="ny-tile-dark mb-4">
        <div className="ny-eyebrow text-white/60">İlerleme</div>
        <div className="mt-2 flex items-end gap-2">
          <div className="text-3xl font-semibold tracking-tight">{formatTRY(goal.current)}</div>
          <div className="mb-1 text-sm text-white/60">/ {formatTRY(currentPrice)}</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-[hsl(var(--primary-on-dark))]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-white/70">
          <span>%{Math.round(pct)} tamamlandı</span>
          <span>Tahmini: {etaLabel}</span>
        </div>
      </div>

      <div className="ny-card mb-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="ny-eyebrow">Güncel fiyat</div>
            <div className="mt-1 text-lg font-semibold">{formatTRY(currentPrice)}</div>
            {goal.lastCheckedAt && (
              <div className="mt-1 text-xs opacity-60">
                Son kontrol: {new Date(goal.lastCheckedAt).toLocaleString('tr-TR')}
              </div>
            )}
          </div>
          <div className={`text-sm font-semibold ${drift > 0 ? 'text-amber-600' : 'text-primary'}`}>
            {drift > 0 ? '+' : ''}%{drift}
          </div>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full">
          <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2" points={pts} />
        </svg>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs opacity-60">Fiyat geçmişi</div>
          <button
            onClick={() => refreshPrice.mutate(goal.id)}
            disabled={refreshPrice.isPending || !goal.normalizedQuery}
            className="ny-chip"
          >
            <RefreshCw size={14} className={`mr-1 inline ${refreshPrice.isPending ? 'animate-spin' : ''}`} />
            Fiyatı yenile
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="ny-card mb-4">
          <div className="ny-eyebrow mb-3">Yeni fiyat alarmları</div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-[hsl(var(--hairline))] p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">
                    {alert.direction === 'INCREASE' ? 'Fiyat arttı' : 'Fiyat düştü'}
                  </span>
                  <span className={alert.direction === 'INCREASE' ? 'text-amber-600' : 'text-primary'}>
                    %{Math.round(Math.abs(alert.percentageChange) * 100)}
                  </span>
                </div>
                <div className="mt-1 text-xs opacity-70">
                  {formatTRY(alert.oldPrice)} → {formatTRY(alert.newPrice)}
                </div>
                <div className="mt-1 text-xs opacity-70">
                  Gerekli aylık: {formatTRY(alert.monthlySavingNeeded)}
                </div>
                <button onClick={() => markAlertRead.mutate(alert.id)} className="ny-chip mt-2">
                  Okundu işaretle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ny-card mb-4">
        <div className="flex items-center justify-between">
          <div className="ny-eyebrow">Beklenen yıllık enflasyon</div>
          <div className="text-sm font-semibold">%{Math.round(inflation)}</div>
        </div>
        <input
          type="range"
          min={0}
          max={80}
          value={inflation}
          onChange={(e) => updateGoal.mutate({ id: goal.id, input: { inflationPct: +e.target.value } })}
          className="mt-3 w-full accent-[hsl(var(--primary))]"
        />
        <div className="mt-1 text-xs opacity-60">
          Hedef değeri yıllık %{Math.round(inflation)} artışla yeniden hesaplanır.
        </div>
      </div>

      <div className="ny-card mb-4">
        <div className="ny-eyebrow mb-3">Tasarruf senaryoları</div>
        <div className="space-y-2">
          {scenarios.map((s, i) => (
            <button
              key={s.label}
              onClick={() => updateGoal.mutate({ id: goal.id, input: { monthlyContribution: s.monthly } })}
              className={`flex w-full items-center justify-between rounded-xl border p-3 ${
                s.monthly === monthly ? 'border-primary bg-primary/5' : 'border-[hsl(var(--hairline))]'
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs opacity-60">{formatTRY(s.monthly)} / ay</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{s.eta} ay</div>
                <div className="text-xs opacity-60">{i === 0 ? 'tahmini' : `${monthsToGoal - s.eta} ay erken`}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="ny-card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="ny-eyebrow">Checkpoint bildirimleri</div>
          <span className="text-xs opacity-60">
            {goal.checkpoints?.filter((c) => pct >= c.percent).length ?? 0} ulaşıldı
          </span>
        </div>
        <div className="space-y-2">
          {(goal.checkpoints ?? []).map((c) => {
            const reached = pct >= c.percent;
            return (
              <div key={c.id} className="flex items-center gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    reached ? 'bg-primary text-white' : 'bg-[hsl(var(--divider-soft))]'
                  }`}
                >
                  {reached ? <Check size={14} /> : <span className="text-[10px] font-semibold">%{c.percent}</span>}
                </div>
                <div className="flex-1 text-sm">{c.label}</div>
                <div className="text-xs opacity-60">{reached ? 'ulaşıldı' : 'bekliyor'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ny-card mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Tasarruf planını otomatik güncelle</div>
          <p className="mt-1 text-xs opacity-60">Fiyat değişince aylık katkın yeniden hesaplanır.</p>
        </div>
        <button
          onClick={() => updateGoal.mutate({ id: goal.id, input: { autoUpdate: !goal.autoUpdate } })}
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

      <button
        onClick={() => {
          updateGoal.mutate({ id: goal.id, input: { coachContext: goal.name } });
          router.push(`/chatbot?goalId=${goal.id}`);
        }}
        className="ny-pill flex w-full items-center justify-center gap-2"
      >
        <Sparkles size={16} /> AI Tasarruf Koçu ile konuş
      </button>
    </PhoneShell>
  );
}
