'use client';

import { Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';

export default function DemoResultPage() {
  const router = useRouter();
  const [shared, setShared] = useState(false);
  const share = async () => {
    const text = 'Niyet ile yıllık 29.400 ₺ mikro katkı potansiyelim var. Sen de dene!';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Niyet özetim', text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // User cancelled share — sessizce devam
    }
  };
  return (
    <PhoneShell dark hideTabs scroll>
      <div className="flex items-start justify-between pb-6 pt-6">
        <div>
          <div className="ny-eyebrow text-white/60">Demo özeti</div>
          <h1 className="ny-tight mt-2 text-[34px] font-semibold leading-tight">
            Niyet&apos;le geleceğin böyle görünebilir.
          </h1>
        </div>
        <button
          onClick={share}
          className="ny-chip mt-2 shrink-0 border-white/20 bg-white/10 text-white"
        >
          <Share2 size={14} className="mr-1" /> {shared ? 'Kopyalandı' : 'Paylaş'}
        </button>
      </div>
      <div className="space-y-3">
        <div className="rounded-[18px] bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wider text-white/60">
            Aylık mikro katkı potansiyeli
          </div>
          <div className="ny-tight mt-2 text-4xl font-semibold">2.450 ₺</div>
        </div>
        <div className="rounded-[18px] bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wider text-white/60">Yıllık potansiyel</div>
          <div className="ny-tight mt-2 text-4xl font-semibold">29.400 ₺</div>
        </div>
        <div className="rounded-[18px] bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wider text-white/60">Gelecek Skoru artışı</div>
          <div className="ny-tight mt-2 text-4xl font-semibold text-[hsl(var(--primary-on-dark))]">
            +12
          </div>
        </div>
        <div className="rounded-[18px] bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wider text-white/60">En yüksek fırsatlar</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span>🍽 Dışarı yemek</span>
              <span className="text-[hsl(var(--primary-on-dark))]">+900 ₺</span>
            </li>
            <li className="flex justify-between">
              <span>🛍 Online alışveriş</span>
              <span className="text-[hsl(var(--primary-on-dark))]">+700 ₺</span>
            </li>
            <li className="flex justify-between">
              <span>☕ Kahve</span>
              <span className="text-[hsl(var(--primary-on-dark))]">+300 ₺</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-6 space-y-3 pb-6">
        <button className="ny-pill w-full" onClick={() => router.push('/connect')}>
          Gerçek hesabımı bağla
        </button>
        <button
          className="ny-pill-ghost w-full border-white/40 text-white"
          onClick={() => router.push('/dashboard')}
        >
          Demo&apos;ya dön
        </button>
      </div>
    </PhoneShell>
  );
}
