'use client';

import { TrendingUp } from 'lucide-react';

import { PhoneShell } from '@/components/phone-shell';

export default function ScorePage() {
  const factors = [
    { name: 'Düzenli katkı', v: 80 },
    { name: 'Hedefe bağlılık', v: 65 },
    { name: 'Harcama azaltma', v: 60 },
    { name: 'Katkı sürekliliği', v: 70 },
  ];
  return (
    <PhoneShell title="Gelecek Skoru" back>
      <div className="ny-tile-dark mb-5 py-8 text-center">
        <div className="text-xs uppercase tracking-wider text-white/60">Skorun</div>
        <div className="ny-tight mt-2 text-[88px] font-semibold leading-none">68</div>
        <div className="mt-2 text-white/60">üzerinden 100</div>
        <div className="mt-3 inline-flex items-center gap-1 text-sm text-[hsl(var(--primary-on-dark))]">
          <TrendingUp size={14} /> Geçen aydan +4
        </div>
      </div>
      <p className="ny-tagline mb-4">
        Skorun seni cezalandırmak için değil, motive etmek için var.
      </p>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.name} className="ny-card">
            <div className="mb-2 flex justify-between text-sm">
              <span>{f.name}</span>
              <span className="font-semibold">{f.v}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
              <div className="bg-primary h-full" style={{ width: `${f.v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
