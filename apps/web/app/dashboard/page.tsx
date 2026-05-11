'use client';

import {
  CreditCard,
  GraduationCap,
  History as HistoryIcon,
  Pause,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { ScoreCard } from '@/components/score-card';
import { fmt, useApp } from '@/lib/stores/use-app';

export default function DashboardPage() {
  const router = useRouter();
  const acceptedSavings = useApp((s) => s.acceptedSavings);
  const goals = useApp((s) => s.goals);
  const paused = useApp((s) => s.paused);
  const rulesLen = useApp((s) => s.rules.length);
  const goal = goals[0]!;
  return (
    <PhoneShell
      rightSlot={
        <Link href="/settings" aria-label="Ayarlar" className="p-1">
          <Settings size={20} className="opacity-70" />
        </Link>
      }
    >
      <div className="pb-4 pt-2">
        <div className="ny-eyebrow">Merhaba Ayşe</div>
        <h1 className="ny-h1 mt-1">Bu ay 2.450 ₺ kurtarabilirsin.</h1>
      </div>

      {paused && (
        <div className="ny-card border-primary/30 mb-3 flex items-center gap-3">
          <Pause size={18} className="text-primary" />
          <div className="flex-1 text-sm">Katkıların duraklatıldı.</div>
          <Link href="/pause" className="text-primary text-sm font-semibold">
            Yönet
          </Link>
        </div>
      )}

      <ScoreCard
        score={68}
        delta={4}
        title="İyi gidiyorsun"
        subtitle="Üzerine gel — genel istatistiklerini gör."
        status="Sağlıklı finansal ritim"
        onOpen={() => router.push('/score')}
        stats={[
          {
            label: 'Kabul edilen tasarruf',
            value: fmt(acceptedSavings || 1850),
            foot: 'son 30 gün',
          },
          { label: 'Aktif kural', value: `${rulesLen}`, foot: 'otomatik katkı' },
          {
            label: 'Hedef ilerleme',
            value: `${Math.round((goal.current / goal.target) * 100)}%`,
            foot: goal.name,
          },
          { label: 'Bu ay fırsat', value: '2.450 ₺', foot: 'azaltılabilir' },
        ]}
      />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <Link href="/radar" className="ny-card text-left">
          <div className="ny-eyebrow">Fırsat</div>
          <div className="mt-1 text-2xl font-semibold">2.450 ₺</div>
          <div className="mt-1 text-xs opacity-60">azaltılabilir harcama</div>
        </Link>
        <Link href="/rule" className="ny-card text-left">
          <div className="ny-eyebrow">Önerilen katkı</div>
          <div className="text-primary mt-1 text-2xl font-semibold">750 ₺</div>
          <div className="mt-1 text-xs opacity-60">bu ay</div>
        </Link>
      </div>

      <Link href="/goals" className="ny-card mb-3 block w-full text-left">
        <div className="flex items-center justify-between">
          <div>
            <div className="ny-eyebrow">Aktif hedef</div>
            <div className="mt-1 font-semibold">{goal.name}</div>
          </div>
          <div className="text-sm opacity-60">
            {Math.round((goal.current / goal.target) * 100)}%
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
          <div
            className="bg-primary h-full"
            style={{ width: `${(goal.current / goal.target) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-xs opacity-60">
          {fmt(goal.current)} / {fmt(goal.target)}
        </div>
      </Link>

      <div className="ny-eyebrow mb-2 mt-5">Hızlı erişim</div>
      <div className="mb-3 grid grid-cols-3 gap-3">
        <QuickTile icon={<Pause size={18} />} label="Nefes ayı" href="/pause" />
        <QuickTile icon={<Users size={18} />} label="Çemberler" href="/circles" />
        <QuickTile icon={<HistoryIcon size={18} />} label="Geçmiş" href="/history" />
        <QuickTile icon={<CreditCard size={18} />} label="Abonelik" href="/subscriptions" />
        <QuickTile icon={<GraduationCap size={18} />} label="Öğren" href="/learn" />
        <QuickTile icon={<TrendingUp size={18} />} label="Fonlar" href="/funds" />
      </div>

      <div className="ny-card mb-3">
        <div className="ny-eyebrow">Yaklaşan</div>
        <div className="mt-2 text-sm">
          28 Mayıs · Maaş günü katkısı <span className="text-primary font-semibold">1.000 ₺</span>
        </div>
      </div>

      <Link href="/demo-result" className="ny-pill-ghost block w-full text-center">
        Demo özetini gör
      </Link>
      {acceptedSavings > 0 && (
        <p className="text-primary mt-3 text-center text-xs">
          Bu oturumda {fmt(acceptedSavings)} katkıya dönüştürdün ✨
        </p>
      )}
    </PhoneShell>
  );
}

function QuickTile({ icon, label, href }: { icon: ReactNode; label: string; href: Route }) {
  return (
    <Link href={href} className="ny-card flex flex-col items-center gap-2 !p-3 text-center">
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
