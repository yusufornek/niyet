'use client';

import { Info } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { type RiskProfile, useFundRecommendations, useGoals } from '@/lib/graphql/queries';

export default function FundsPage() {
  const searchParams = useSearchParams();
  const goalId = searchParams.get('goalId') ?? undefined;

  const [riskProfile, setRiskProfile] = useState<RiskProfile>('BALANCED');
  const [manualYears, setManualYears] = useState(10);
  const { data: goalsData } = useGoals();

  const selectedGoal = useMemo(
    () => (goalId ? (goalsData?.goals ?? []).find((goal) => goal.id === goalId) : null),
    [goalId, goalsData?.goals],
  );

  const yearsFromGoal = selectedGoal
    ? Math.max(
        1,
        Math.round(
          (new Date(selectedGoal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365),
        ),
      )
    : null;

  const recommendations = useFundRecommendations({
    riskProfile,
    goalId,
    ...(goalId ? {} : { targetYears: manualYears }),
    enabled: true,
  });

  const list = recommendations.data?.fundRecommendations ?? [];

  return (
    <PhoneShell title="Fon seçenekleri" back>
      <div className="ny-card mb-4 flex gap-3">
        <Info size={18} className="text-primary mt-0.5 shrink-0" />
        <p className="text-xs">Bu yatırım tavsiyesi değildir. Karar tamamen sana aittir.</p>
      </div>
      <div className="ny-card mb-4">
        <div className="ny-eyebrow mb-2">Risk profilin</div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[
            { key: 'VERY_LOW', label: 'Çok düşük' },
            { key: 'LOW', label: 'Düşük' },
            { key: 'BALANCED', label: 'Dengeli' },
            { key: 'HIGH', label: 'Yüksek' },
            { key: 'VERY_HIGH', label: 'Çok yüksek' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setRiskProfile(option.key as RiskProfile)}
              className={`ny-chip text-left ${riskProfile === option.key ? 'border-primary text-primary' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {goalId ? (
          <div className="text-xs opacity-70">
            Hedef süresi otomatik alındı: {yearsFromGoal ?? '—'} yıl
          </div>
        ) : (
          <>
            <label className="mb-1 block text-xs opacity-60">Hedef süre (yıl)</label>
            <input
              type="number"
              min={1}
              max={40}
              value={manualYears}
              onChange={(e) =>
                setManualYears(Math.max(1, Math.min(40, Number(e.target.value) || 1)))
              }
              className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
            />
          </>
        )}
      </div>
      <div className="space-y-3">
        {recommendations.isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="ny-card h-24 animate-pulse" />
            ))}
          </>
        )}
        {list.map((f) => (
          <div key={f.id} className="ny-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{f.name}</div>
                <div className="text-sm opacity-60">{f.summary}</div>
              </div>
              <div className="text-right">
                <div className="ny-eyebrow">Beklenen</div>
                <div className="text-primary font-semibold">{f.expectedReturnBand}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="opacity-70">Uyum skoru</span>
              <span className="font-semibold">{f.score}/100</span>
            </div>
            <div className="mt-2 text-xs opacity-70">{f.whyFits}</div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
