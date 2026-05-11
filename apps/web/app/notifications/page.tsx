'use client';

import Link from 'next/link';

import { PhoneShell } from '@/components/phone-shell';
import {
  useCategoryBreakdown,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/graphql/queries';
import { useApp } from '@/lib/stores/use-app';
import { formatTRY } from '@/lib/utils';

const CATEGORY_LABEL: Record<string, { label: string; icon: string }> = {
  COFFEE: { label: 'Kahve', icon: '☕' },
  FOOD_DELIVERY: { label: 'Yemek Siparişi', icon: '🛵' },
  DINING_OUT: { label: 'Dışarı Yemek', icon: '🍽' },
  ONLINE_SHOPPING: { label: 'Online Alışveriş', icon: '🛍' },
  ENTERTAINMENT: { label: 'Eğlence', icon: '🎬' },
  SUBSCRIPTIONS: { label: 'Abonelikler', icon: '📺' },
};

export default function NotificationsPage() {
  const notificationsEnabled = useApp((s) => s.notificationsEnabled);
  const toggleNotifications = useApp((s) => s.toggleNotifications);
  const thresholds = useApp((s) => s.thresholds);
  const setThreshold = useApp((s) => s.setThreshold);

  const { data, isLoading } = useNotifications();
  const { data: catData } = useCategoryBreakdown('LAST_30D');
  const markRead = useMarkNotificationRead();

  const items = data?.notifications ?? [];
  // Reducible kategorilerden ilk 4 — eşik gösterimi için
  const reducibleCats = (catData?.categoryBreakdown ?? [])
    .filter((c) => c.opportunity > 0)
    .filter((c) => CATEGORY_LABEL[c.category])
    .slice(0, 5);

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
          aria-label="Bildirimleri aç/kapat"
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
              notificationsEnabled ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>

      <div className="ny-eyebrow mb-2">Son bildirimler</div>
      {isLoading ? (
        <div className="mb-5 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ny-card h-20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="ny-tagline mb-5">Henüz bildirim yok.</p>
      ) : (
        <div className="mb-5 space-y-3">
          {items.map((i) => (
            <button
              key={i.id}
              onClick={() => !i.read && markRead.mutate(i.id)}
              className={`ny-card w-full text-left ${i.read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold">{i.title}</div>
                {!i.read && <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />}
              </div>
              <div className="mt-1 text-sm opacity-70">{i.body}</div>
            </button>
          ))}
        </div>
      )}

      {reducibleCats.length > 0 && (
        <>
          <div className="ny-eyebrow mb-2">Kategori uyarı eşikleri</div>
          <div className="mb-5 space-y-3">
            {reducibleCats.map((c) => {
              const meta = CATEGORY_LABEL[c.category]!;
              const v = thresholds[c.category] ?? c.avg;
              return (
                <div key={c.category} className="ny-card">
                  <div className="mb-2 flex justify-between">
                    <span className="text-sm">
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-primary text-sm font-semibold">{formatTRY(v)}</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={6000}
                    step={50}
                    value={v}
                    onChange={(e) => setThreshold(c.category, +e.target.value)}
                    className="w-full accent-[hsl(var(--primary))]"
                    aria-label={`${meta.label} eşiği`}
                  />
                  <p className="mt-1 text-xs opacity-60">Bu tutara yaklaştığında uyarılacaksın.</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Link href="/pause" className="text-primary block w-full text-center text-sm">
        Nefes ayı ayarla →
      </Link>
    </PhoneShell>
  );
}
