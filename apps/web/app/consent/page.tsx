'use client';

import { Check, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';

export default function ConsentPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  return (
    <PhoneShell title="Veri izni" back hideTabs>
      <p className="ny-tagline mb-5">
        Verilerin yalnızca tasarruf fırsatlarını hesaplamak için kullanılır. İstediğin zaman
        bağlantıyı Ayarlar&apos;dan kesebilirsin.
      </p>
      <div className="ny-card mb-3">
        <div className="ny-eyebrow mb-3">Kullanılacak veriler</div>
        <ul className="space-y-3 text-[15px]">
          <li className="flex gap-3">
            <Check size={18} className="text-primary mt-0.5" />
            Harcama kategorileri
          </li>
          <li className="flex gap-3">
            <Check size={18} className="text-primary mt-0.5" />
            İşlem tutarları ve tarih
          </li>
          <li className="flex gap-3">
            <Check size={18} className="text-primary mt-0.5" />
            Tekrar eden ödemeler
          </li>
        </ul>
      </div>
      <div className="ny-card mb-5 flex items-start gap-3">
        <Shield size={20} className="text-primary mt-0.5 shrink-0" />
        <p className="text-[13px] text-[hsl(var(--ink-muted-80))]">
          Hiçbir veri üçüncü taraflarla paylaşılmaz. Bağlantı kesildiğinde veriler silinir.
        </p>
      </div>
      <label className="mb-6 flex cursor-pointer select-none items-start gap-3">
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => setOk(e.target.checked)}
          className="mt-1 h-5 w-5 accent-[hsl(var(--primary))]"
        />
        <span className="text-[14px]">Açık rıza ile veri işlenmesini kabul ediyorum.</span>
      </label>
      <button
        className="ny-pill w-full disabled:opacity-40"
        disabled={!ok}
        onClick={() => router.push('/connect')}
      >
        Devam et
      </button>
    </PhoneShell>
  );
}
