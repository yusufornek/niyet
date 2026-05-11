'use client';

import { Pause } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { useApp } from '@/lib/stores/use-app';

export default function PausePage() {
  const router = useRouter();
  const paused = useApp((s) => s.paused);
  const setPaused = useApp((s) => s.setPaused);
  const [months, setMonths] = useState(1);
  return (
    <PhoneShell title="Nefes ayı" back>
      <div className="ny-tile-dark mb-4">
        <Pause size={28} />
        <div className="mt-2 text-lg font-semibold">
          {paused ? 'Katkıların duraklatıldı' : 'Katkıları geçici duraklat'}
        </div>
        <div className="mt-1 text-sm text-white/70">
          Maddi olarak zorlandığında baskı hissetmeden ara verebilirsin.
        </div>
      </div>
      {!paused && (
        <div className="ny-card mb-4">
          <div className="ny-eyebrow mb-2">Süre</div>
          <div className="flex gap-2">
            {[1, 2, 3, 6].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`ny-chip flex-1 justify-center ${
                  months === m ? 'border-primary text-primary' : ''
                }`}
              >
                {m} ay
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => {
          setPaused(!paused);
          router.push('/dashboard');
        }}
        className="ny-pill w-full"
      >
        {paused ? 'Katkıları sürdür' : `${months} ay duraklat`}
      </button>
      <p className="mt-3 text-center text-xs opacity-60">İstediğin an aktif edebilirsin.</p>
    </PhoneShell>
  );
}
