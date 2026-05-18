'use client';

/**
 * /savings — "Birikim" sekmesi. Tek route altinda 2 segmented view:
 *   - Tasarruf Radarı (harcama analizi)
 *   - Hedeflerim
 *
 * Ana tab bar'daki "Radar" ve "Hedefler" tek "Birikim" butonuna toplandi.
 * Eski `/radar` ve `/goals` route'lari yine çalışır (geri uyumluluk + dynamic
 * `/goals/[id]` detay sayfasi). Yeni `/savings` ana giris noktasi.
 */
import { BarChart3, Target } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { GoalsContent } from '@/components/goals-content';
import { PhoneShell } from '@/components/phone-shell';
import { RadarContent } from '@/components/radar-content';

type SavingsTab = 'radar' | 'goals';

export default function SavingsPage() {
  return (
    <Suspense
      fallback={
        <PhoneShell title="Birikim">
          <div className="ny-card h-32 animate-pulse" />
        </PhoneShell>
      }
    >
      <SavingsPageInner />
    </Suspense>
  );
}

function SavingsPageInner() {
  const params = useSearchParams();
  const initialTab: SavingsTab = params.get('tab') === 'goals' ? 'goals' : 'radar';
  const [tab, setTab] = useState<SavingsTab>(initialTab);

  return (
    <PhoneShell title="Birikim">
      {/* Segmented control */}
      <div
        className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-[hsl(var(--divider-soft))] p-1"
        role="tablist"
        aria-label="Birikim sekmeleri"
      >
        <SegmentBtn
          icon={<BarChart3 size={14} />}
          label="Radar"
          active={tab === 'radar'}
          onClick={() => setTab('radar')}
        />
        <SegmentBtn
          icon={<Target size={14} />}
          label="Hedeflerim"
          active={tab === 'goals'}
          onClick={() => setTab('goals')}
        />
      </div>

      {tab === 'radar' ? <RadarContent /> : <GoalsContent />}
    </PhoneShell>
  );
}

interface SegmentProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SegmentBtn({ icon, label, active, onClick }: SegmentProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-colors ${
        active
          ? 'text-foreground bg-white shadow-sm'
          : 'hover:text-foreground text-[hsl(var(--muted-foreground))]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
