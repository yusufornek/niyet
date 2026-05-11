'use client';

import Link from 'next/link';

import { PhoneShell } from '@/components/phone-shell';
import { categories, fmt, useApp } from '@/lib/stores/use-app';

export default function NotificationsPage() {
  const notificationsEnabled = useApp((s) => s.notificationsEnabled);
  const toggleNotifications = useApp((s) => s.toggleNotifications);
  const thresholds = useApp((s) => s.thresholds);
  const setThreshold = useApp((s) => s.setThreshold);
  const items = [
    { t: 'Hedefe yaklaşıyorsun', d: "Emeklilik hedefinin %7'sine ulaştın." },
    { t: 'Kahve uyarısı', d: 'Bu ay kahve harcaman ortalamayı geçmek üzere.' },
    { t: 'Maaş günü', d: 'Yarın 1.000 ₺ otomatik katkı yapılacak.' },
  ];
  const cats = categories.filter((c) => c.reducible);
  return (
    <PhoneShell title="Bildirimler">
      <div className="ny-card mb-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">Bildirim izinleri</div>
          <div className="text-xs opacity-60">İstediğin zaman kapatabilirsin</div>
        </div>
        <button
          onClick={toggleNotifications}
          className={`h-7 w-11 rounded-full p-0.5 ${
            notificationsEnabled ? 'bg-primary' : 'bg-[hsl(var(--divider-soft))]'
          }`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
              notificationsEnabled ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>

      <div className="ny-eyebrow mb-2">Son bildirimler</div>
      <div className="mb-5 space-y-3">
        {items.map((i) => (
          <div key={i.t} className="ny-card">
            <div className="font-semibold">{i.t}</div>
            <div className="mt-1 text-sm opacity-70">{i.d}</div>
          </div>
        ))}
      </div>

      <div className="ny-eyebrow mb-2">Kategori uyarı eşikleri</div>
      <div className="mb-5 space-y-3">
        {cats.map((c) => {
          const v = thresholds[c.id] ?? c.avg;
          return (
            <div key={c.id} className="ny-card">
              <div className="mb-2 flex justify-between">
                <span className="text-sm">
                  {c.icon} {c.name}
                </span>
                <span className="text-primary text-sm font-semibold">{fmt(v)}</span>
              </div>
              <input
                type="range"
                min={100}
                max={6000}
                step={50}
                value={v}
                onChange={(e) => setThreshold(c.id, +e.target.value)}
                className="w-full accent-[hsl(var(--primary))]"
              />
              <p className="mt-1 text-xs opacity-60">Bu tutara yaklaştığında uyarılacaksın.</p>
            </div>
          );
        })}
      </div>

      <Link href="/pause" className="text-primary block w-full text-center text-sm">
        Nefes ayı ayarla →
      </Link>
    </PhoneShell>
  );
}
