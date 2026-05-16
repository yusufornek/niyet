'use client';

import { Pause, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { useMe, usePauseContributions, useResumeContributions } from '@/lib/graphql/queries';

/**
 * Nefes Ayı sayfası — PBI: maddi zorlukta katkıları geçici duraklatma.
 *
 * Zustand mock'tan sunucu state'ine geçildi. `useMe` üzerinden `pauseStatus`
 * okunur (pure logic backend'de `packages/core/pause.ts`), pause/resume
 * mutation'ları kalıcı yazar.
 */
export default function PausePage() {
  const router = useRouter();
  const { data: meData } = useMe();
  const pauseMutation = usePauseContributions();
  const resumeMutation = useResumeContributions();
  const [months, setMonths] = useState(1);

  const status = meData?.me?.pauseStatus;
  const isPaused = status?.isPaused ?? false;
  const isPending = pauseMutation.isPending || resumeMutation.isPending;

  const handleAction = async () => {
    if (isPaused) {
      await resumeMutation.mutateAsync();
    } else {
      await pauseMutation.mutateAsync(months);
    }
    router.push('/dashboard');
  };

  const pauseTargetDate = status?.pausedUntil
    ? new Date(status.pausedUntil).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <PhoneShell title="Nefes ayı" back>
      <div className="ny-tile-dark mb-4">
        {isPaused ? <Pause size={28} /> : <Pause size={28} />}
        <div className="mt-2 text-lg font-semibold">
          {isPaused ? 'Katkıların duraklatıldı' : 'Katkıları geçici duraklat'}
        </div>
        <div className="mt-1 text-sm text-white/70">
          Maddi olarak zorlandığında baskı hissetmeden ara verebilirsin. Otomatik kural
          tetiklemeleri ve mikro katkı önerileri pause süresi boyunca atlanır.
        </div>
      </div>

      {isPaused && pauseTargetDate && status?.remainingDays != null && (
        <div className="ny-card mb-4 border-amber-300/60 bg-amber-50/40">
          <div className="ny-eyebrow mb-1 flex items-center gap-1 text-amber-900">
            <Pause size={12} /> Aktif duraklatma
          </div>
          <div className="text-sm font-semibold text-amber-900">{status.summary}</div>
          <div className="mt-1 text-xs text-amber-800">
            Otomatik bitiş: <b>{pauseTargetDate}</b>
          </div>
        </div>
      )}

      {!isPaused && (
        <div className="ny-card mb-4">
          <div className="ny-eyebrow mb-2">Süre</div>
          <div className="flex gap-2">
            {[1, 2, 3, 6].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                disabled={isPending}
                className={`ny-chip flex-1 justify-center ${
                  months === m ? 'border-primary text-primary' : ''
                }`}
              >
                {m} ay
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs opacity-60">
            Süre dolduğunda katkılar otomatik olarak yeniden başlar. Bu süre içinde istediğin an
            manuel olarak da sürdürebilirsin.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleAction}
        disabled={isPending}
        className="ny-pill flex w-full items-center justify-center gap-2 disabled:opacity-50"
      >
        {isPending ? (
          'İşleniyor…'
        ) : isPaused ? (
          <>
            <Play size={16} /> Katkıları sürdür
          </>
        ) : (
          <>
            <Pause size={16} /> {months} ay duraklat
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs opacity-60">
        İstediğin an aktif edebilirsin. Niyet sana baskı yapmaz.
      </p>
    </PhoneShell>
  );
}
