'use client';

import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { useApp } from '@/lib/stores/use-app';

export default function SettingsPage() {
  const router = useRouter();
  const connected = useApp((s) => s.connected);
  const setConnected = useApp((s) => s.setConnected);
  const paused = useApp((s) => s.paused);
  const notificationsEnabled = useApp((s) => s.notificationsEnabled);
  const toggleNotifications = useApp((s) => s.toggleNotifications);
  const [confirm, setConfirm] = useState(false);
  return (
    <PhoneShell title="Ayarlar" back>
      <div className="ny-card mb-3">
        <div className="ny-eyebrow mb-3">Profil</div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--canvas-parchment))] font-semibold">
            A
          </div>
          <div>
            <div className="font-semibold">Ayşe</div>
            <div className="text-xs opacity-60">22 · Üniversite öğrencisi</div>
          </div>
        </div>
      </div>

      <Row
        label="Bildirimler"
        value={notificationsEnabled ? 'Açık' : 'Kapalı'}
        onClick={toggleNotifications}
      />
      <Row
        label="Nefes ayı"
        value={paused ? 'Aktif' : 'Kapalı'}
        onClick={() => router.push('/pause')}
      />
      <Row
        label="Hesap bağlantısı"
        value={connected ? 'Bağlı' : 'Bağlı değil'}
        onClick={() => (connected ? setConfirm(true) : router.push('/connect'))}
      />

      <div className="ny-eyebrow mb-2 mt-5">Yasal</div>
      <Row label="Gizlilik" value="" onClick={() => {}} />
      <Row label="Kullanım koşulları" value="" onClick={() => {}} />

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full rounded-t-3xl bg-[hsl(var(--canvas))] p-6 sm:max-w-sm sm:rounded-3xl">
            <div className="text-lg font-semibold">Bağlantıyı kes?</div>
            <p className="mt-2 text-sm opacity-70">
              Tüm finansal verilerin silinir. İstediğin zaman yeniden bağlayabilirsin.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirm(false)} className="ny-pill-ghost flex-1">
                Vazgeç
              </button>
              <button
                onClick={() => {
                  setConnected(false);
                  setConfirm(false);
                }}
                className="ny-pill flex-1 !bg-[hsl(var(--destructive))]"
              >
                Bağlantıyı kes
              </button>
            </div>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}

function Row({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="ny-card mb-2 flex w-full items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2 text-sm opacity-60">
        {value}
        <ChevronRight size={16} />
      </span>
    </button>
  );
}
