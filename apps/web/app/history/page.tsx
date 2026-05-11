'use client';

import { PhoneShell } from '@/components/phone-shell';
import { fmt } from '@/lib/stores/use-app';

export default function HistoryPage() {
  const items = [
    { m: 'Mayıs 2026', op: 2450, acc: 750, dec: 8 },
    { m: 'Nisan 2026', op: 2120, acc: 620, dec: 6 },
    { m: 'Mart 2026', op: 1890, acc: 540, dec: 5 },
    { m: 'Şubat 2026', op: 2300, acc: 700, dec: 7 },
  ];
  return (
    <PhoneShell title="Geçmiş analizler" back>
      <p className="ny-tagline mb-4">Yakaladığın fırsatlar ve kararların.</p>
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.m} className="ny-card">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{i.m}</div>
              <div className="text-primary font-semibold">+{fmt(i.acc)}</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="opacity-60">Fırsat</div>
                <div className="text-sm font-semibold">{fmt(i.op)}</div>
              </div>
              <div>
                <div className="opacity-60">Katkı</div>
                <div className="text-sm font-semibold">{fmt(i.acc)}</div>
              </div>
              <div>
                <div className="opacity-60">Karar</div>
                <div className="text-sm font-semibold">{i.dec}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
