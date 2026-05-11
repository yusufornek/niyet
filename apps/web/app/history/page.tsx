'use client';

import { Sparkles } from 'lucide-react';

import { PhoneShell } from '@/components/phone-shell';
import { useAnalysisHistory, useRunAnalysis } from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export default function HistoryPage() {
  const { data, isLoading } = useAnalysisHistory(20);
  const runAnalysis = useRunAnalysis();
  const runs = data?.analysisHistory ?? [];

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
      <p className="ny-tagline mb-4">AI ile yakalanan fırsatlar.</p>

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
        <div className="space-y-3">
          {runs.map((r) => {
            const date = new Date(r.triggeredAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div key={r.id} className="ny-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{date}</div>
                    <div className="text-xs opacity-60">{r.geminiModel}</div>
                  </div>
                  <div className="text-primary font-semibold">+{formatTRY(r.totalOpportunity)}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="opacity-60">İşlem</div>
                    <div className="text-sm font-semibold">{r.totalTransactions}</div>
                  </div>
                  <div>
                    <div className="opacity-60">Süre</div>
                    <div className="text-sm font-semibold">
                      {r.durationMs < 1000
                        ? `${r.durationMs}ms`
                        : `${(r.durationMs / 1000).toFixed(1)}s`}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-60">Durum</div>
                    <div className="text-sm font-semibold">{r.error ? 'Hata' : '✓'}</div>
                  </div>
                </div>
                {r.error && (
                  <div className="bg-destructive/10 text-destructive mt-2 rounded p-2 text-xs">
                    {r.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PhoneShell>
  );
}
