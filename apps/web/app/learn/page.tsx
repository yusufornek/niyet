'use client';

import { BookOpen } from 'lucide-react';

import { PhoneShell } from '@/components/phone-shell';

export default function LearnPage() {
  const items = [
    { t: 'BES nedir?', d: 'Bireysel emeklilik sisteminin temelleri.' },
    { t: 'Devlet katkısı nasıl işler?', d: '%30 devlet katkısının basit anlatımı.' },
    { t: 'Fon türleri', d: 'Hisse, borçlanma, altın ve karma fonlar.' },
    { t: 'Mikro birikim mantığı', d: 'Küçük tutarların büyük etkisi.' },
  ];
  return (
    <PhoneShell title="Öğren" back>
      <p className="ny-tagline mb-4">Tarafsız, kısa ve sade içerikler.</p>
      <div className="space-y-3">
        {items.map((i) => (
          <button key={i.t} className="ny-card flex w-full items-start gap-3 text-left">
            <BookOpen size={20} className="text-primary mt-1 shrink-0" />
            <div>
              <div className="font-semibold">{i.t}</div>
              <div className="mt-1 text-sm opacity-70">{i.d}</div>
            </div>
          </button>
        ))}
      </div>
    </PhoneShell>
  );
}
