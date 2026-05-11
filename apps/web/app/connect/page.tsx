'use client';

import { AlertTriangle, ArrowRight, Check, CreditCard, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { WalletReveal } from '@/components/wallet-reveal';
import { useApp } from '@/lib/stores/use-app';

export default function ConnectPage() {
  const router = useRouter();
  const setConnected = useApp((s) => s.setConnected);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const banks: { name: string; connected?: boolean }[] = [
    { name: 'Garanti BBVA', connected: true },
    { name: 'İş Bankası', connected: true },
    { name: 'Akbank', connected: true },
    { name: 'Yapı Kredi' },
    { name: 'Ziraat' },
  ];
  const tryConnect = (fail = false) => {
    setState('loading');
    setTimeout(() => {
      if (fail) {
        setState('error');
      } else {
        setConnected(true);
        router.push('/radar');
      }
    }, 1100);
  };
  return (
    <PhoneShell title="Banka bağla" back hideTabs>
      <WalletReveal balance="₺ 18.400,00" hint="Cüzdanın üzerine gel — bakiyeni gör" />
      <p className="ny-tagline mb-5">
        Hesabını güvenli şekilde bağla. Demo modunda gerçek veri kullanılmaz.
      </p>
      <button
        onClick={() => tryConnect(false)}
        className="ny-card mb-3 flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-3">
          <Sparkles size={20} className="text-primary" />{' '}
          <span className="font-semibold">Demo bağlantı</span>
        </span>
        <ArrowRight size={18} className="opacity-60" />
      </button>
      <div className="ny-eyebrow mb-2 mt-4">Bankalar</div>
      <div className="space-y-2">
        {banks.map((b) => (
          <button
            key={b.name}
            onClick={() => tryConnect(false)}
            className="ny-card flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-3">
              <CreditCard size={20} className={b.connected ? 'text-primary' : 'opacity-70'} />{' '}
              {b.name}
            </span>
            {b.connected ? (
              <span className="text-primary flex items-center gap-1 text-xs font-semibold">
                <Check size={14} /> Bağlı
              </span>
            ) : (
              <ArrowRight size={16} className="opacity-50" />
            )}
          </button>
        ))}
      </div>
      {state === 'loading' && <p className="mt-6 text-center text-sm opacity-70">Bağlanıyor…</p>}
      {state === 'error' && (
        <div className="ny-card border-destructive/30 mt-6">
          <div className="text-destructive mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} /> Bağlantı başarısız
          </div>
          <p className="text-sm opacity-70">
            Lütfen tekrar deneyin. Demo bağlantıyı da kullanabilirsin.
          </p>
        </div>
      )}
      <button
        onClick={() => tryConnect(true)}
        className="text-primary mt-4 w-full text-center text-xs"
      >
        Hata durumunu simüle et
      </button>
    </PhoneShell>
  );
}
