'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';

export default function OnboardingPage() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const slides = [
    {
      eyebrow: 'Niyet',
      title: (
        <>
          Harcamadığını <span className="text-[hsl(var(--primary-on-dark))]">geleceğine</span>{' '}
          aktar.
        </>
      ),
      body: 'AI destekli mikro emeklilik ve birikim asistanın.',
    },
    {
      eyebrow: 'Nasıl çalışır',
      title: (
        <>
          Harcamalarını <span className="text-[hsl(var(--primary-on-dark))]">izinli</span> şekilde
          analiz eder.
        </>
      ),
      body: 'Azaltabileceğin kategorileri ve fırsat tutarlarını görürsün.',
    },
    {
      eyebrow: 'Karar senin',
      title: (
        <>
          Küçük tasarruflar, <span className="text-[hsl(var(--primary-on-dark))]">büyük</span>{' '}
          birikim.
        </>
      ),
      body: 'Onayladığın tutarları mikro katkıya dönüştür. Kontrol her zaman sende.',
    },
  ];
  const s = slides[i]!;
  const last = i === slides.length - 1;
  return (
    <PhoneShell dark hideTabs scroll={false}>
      <div className="flex h-full flex-col justify-between pt-10">
        <div className="space-y-6">
          <div className="ny-eyebrow text-white/60">{s.eyebrow}</div>
          <h1 className="ny-tight text-[40px] font-semibold leading-[1.05]">{s.title}</h1>
          <p className="max-w-[300px] text-[17px] leading-snug text-white/70">{s.body}</p>
        </div>
        <div className="space-y-4 pb-4">
          <div className="flex justify-center gap-2">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
          <button
            className="ny-pill w-full"
            onClick={() => (last ? router.push('/signup') : setI(i + 1))}
          >
            {last ? 'Hesap oluştur' : 'Devam'}
          </button>
          <button
            className="ny-pill-ghost w-full border-white/40 text-white"
            onClick={() => router.push('/login')}
          >
            Demo modunda dene
          </button>
          <p className="pt-1 text-center text-[11px] text-white/40">Yatırım tavsiyesi içermez.</p>
        </div>
      </div>
    </PhoneShell>
  );
}
