'use client';

import { ChevronRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { PhoneShell } from '@/components/phone-shell';
import { useAnalysisHistory, useRunAnalysis } from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

/**
 * Geçmiş analizler arasındaki trend ve kişiselleştirilmiş insight.
 * Son 2 run'ı karşılaştırır; tek run varsa "ilk analiz" mesajı döner.
 */
function buildInsight(runs: { totalOpportunity: number; triggeredAt: string }[]): {
  headline: string;
  body: string;
  delta: number | null;
  direction: 'up' | 'down' | 'flat' | 'first';
} {
  if (runs.length === 0) {
    return {
      headline: 'Henüz analiz yok',
      body: 'İlk AI analizini tetikleyince burada kişisel öneriler görürsün.',
      delta: null,
      direction: 'first',
    };
  }
  if (runs.length === 1) {
    return {
      headline: 'İlk analiz tamamlandı',
      body: `${formatTRY(runs[0]!.totalOpportunity)} mikro katkı potansiyeli tespit ettik. İkinci analizden sonra trend göreceksin.`,
      delta: null,
      direction: 'first',
    };
  }

  const latest = runs[0]!;
  const prev = runs[1]!;
  const delta = latest.totalOpportunity - prev.totalOpportunity;
  const pctChange =
    prev.totalOpportunity > 0 ? Math.round((delta / prev.totalOpportunity) * 100) : 0;

  if (Math.abs(pctChange) < 5) {
    return {
      headline: 'Harcama profiln dengelenmiş',
      body: `Fırsat tutarın %${Math.abs(pctChange)} değişti. Mevcut kuralların işliyor; haftalık katkını %20 artırmak hedefe daha erken ulaşmana yardım eder.`,
      delta,
      direction: 'flat',
    };
  }

  if (delta > 0) {
    return {
      headline: 'Fırsat tutarın arttı',
      body: `Bu analizde ${formatTRY(delta)} daha fazla potansiyel tespit edildi (+%${pctChange}). Azaltılabilir harcamalar büyüyor — şimdi bir mikro katkı kuralı ekleyerek değerlendir.`,
      delta,
      direction: 'up',
    };
  }

  return {
    headline: 'Harcamaların azalıyor 🎯',
    body: `Geçen analizden bu yana ${formatTRY(Math.abs(delta))} daha az fırsat var (${pctChange}%). Harcama disiplinini geliştirmeye başladığın anlamına geliyor — devam et.`,
    delta,
    direction: 'down',
  };
}

export default function HistoryPage() {
  const { data, isLoading } = useAnalysisHistory(20);
  const runAnalysis = useRunAnalysis();
  const runs = data?.analysisHistory ?? [];
  const insight = buildInsight(runs);
  const cumulative = runs.reduce((s, r) => s + r.totalOpportunity, 0);

  return (
    <PhoneShell
      title="Geçmiş analizler"
      back
      rightSlot={
        <button
          onClick={() => runAnalysis.mutate(true)}
          disabled={runAnalysis.isPending}
          className="bg-primary text-primary-foreground flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          <Sparkles size={14} /> {runAnalysis.isPending ? '…' : 'Yeni analiz'}
        </button>
      }
    >
      <p className="ny-tagline mb-4">AI ile yakalanan fırsatlar ve karar geçmişin.</p>

      {runs.length > 0 && (
        <div className="ny-tile-dark mb-4">
          <div className="flex items-start gap-2">
            <div className="mt-0.5">
              {insight.direction === 'up' && <TrendingUp size={20} className="text-amber-300" />}
              {insight.direction === 'down' && (
                <TrendingDown size={20} className="text-[hsl(var(--primary-on-dark))]" />
              )}
              {(insight.direction === 'flat' || insight.direction === 'first') && (
                <Sparkles size={20} className="text-[hsl(var(--primary-on-dark))]" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold">{insight.headline}</div>
              <p className="mt-1 text-sm text-white/80">{insight.body}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
            <div>
              <div className="text-white/50">Toplam fırsat ({runs.length} analiz)</div>
              <div className="mt-0.5 font-semibold text-[hsl(var(--primary-on-dark))]">
                {formatTRY(cumulative)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-white/50">Ortalama / analiz</div>
              <div className="mt-0.5 font-semibold">
                {formatTRY(Math.round(cumulative / runs.length))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ny-card h-24 animate-pulse" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="ny-card text-center">
          <p className="ny-tagline">Henüz analiz yok.</p>
          <p className="mt-2 text-xs opacity-60">
            &quot;Yeni analiz&quot; butonuna basarak ilk AI analizini tetikle.
          </p>
        </div>
      ) : (
        <>
          <div className="ny-eyebrow mb-2">Tüm analizler</div>
          <div className="space-y-3">
            {runs.map((r) => {
              const date = new Date(r.triggeredAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <Link
                  key={r.id}
                  href={`/history/${r.id}`}
                  className="ny-card hover:border-primary/40 flex items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{date}</div>
                        <div className="text-xs opacity-60">
                          {r.geminiModel.startsWith('stub') ? 'Demo modu' : r.geminiModel}
                          {' · '}
                          {r.totalTransactions} işlem
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-primary font-semibold">
                          +{formatTRY(r.totalOpportunity)}
                        </div>
                        <div className="text-xs opacity-60">
                          {r.durationMs < 1000
                            ? `${r.durationMs}ms`
                            : `${(r.durationMs / 1000).toFixed(1)}s`}
                        </div>
                      </div>
                    </div>
                    {r.error && (
                      <div className="bg-destructive/10 text-destructive mt-2 rounded p-2 text-xs">
                        {r.error}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="shrink-0 opacity-40" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </PhoneShell>
  );
}
