'use client';

import { Info } from 'lucide-react';

import { PhoneShell } from '@/components/phone-shell';

export default function FundsPage() {
  const funds = [
    { name: 'Düşük risk', desc: 'Sermaye koruma odaklı', ret: '%8–12' },
    { name: 'Dengeli', desc: 'Risk ve büyüme dengesi', ret: '%12–18' },
    { name: 'Büyüme odaklı', desc: 'Uzun vadeli büyüme', ret: '%18–28' },
  ];
  return (
    <PhoneShell title="Fon seçenekleri" back>
      <div className="ny-card mb-4 flex gap-3">
        <Info size={18} className="text-primary mt-0.5 shrink-0" />
        <p className="text-xs">Bu yatırım tavsiyesi değildir. Karar tamamen sana aittir.</p>
      </div>
      <div className="space-y-3">
        {funds.map((f) => (
          <div key={f.name} className="ny-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{f.name}</div>
                <div className="text-sm opacity-60">{f.desc}</div>
              </div>
              <div className="text-right">
                <div className="ny-eyebrow">Beklenen</div>
                <div className="text-primary font-semibold">{f.ret}</div>
              </div>
            </div>
            <button className="ny-pill-sm mt-4">Detayı gör</button>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
