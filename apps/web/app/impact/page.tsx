'use client';

/**
 * /impact — "Niyet bana ne kattı?" özet sayfası.
 *
 * PBI: kullanıcının toplam katkı + skor artışı + yıllık katkı potansiyelini
 * net şekilde gördüğü, demo sonunda değil her zaman erişebileceği sayfa.
 *
 * Backend: tek shot `myImpactSummary` aggregate query.
 */
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import {
  useMyImpactSummary,
  type SpendingCategory,
  type UserImpactSummary,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

const CATEGORY_LABEL: Record<SpendingCategory, { label: string; icon: string }> = {
  MARKET: { label: 'Market', icon: '🛒' },
  FOOD_DELIVERY: { label: 'Yemek Siparişi', icon: '🛵' },
  COFFEE: { label: 'Kahve', icon: '☕' },
  DINING_OUT: { label: 'Dışarı Yemek', icon: '🍽' },
  TRANSPORT: { label: 'Ulaşım', icon: '🚇' },
  FUEL: { label: 'Yakıt', icon: '⛽' },
  BILLS: { label: 'Faturalar', icon: '🧾' },
  SUBSCRIPTIONS: { label: 'Abonelikler', icon: '📺' },
  ONLINE_SHOPPING: { label: 'Online Alışveriş', icon: '🛍' },
  CLOTHING: { label: 'Giyim', icon: '👕' },
  HEALTH: { label: 'Sağlık', icon: '💊' },
  ENTERTAINMENT: { label: 'Eğlence', icon: '🎬' },
  EDUCATION: { label: 'Eğitim', icon: '📚' },
  SPORTS: { label: 'Spor', icon: '🏋️' },
  OTHER: { label: 'Diğer', icon: '✨' },
};

export default function ImpactPage() {
  const router = useRouter();
  const { data: impact, isLoading, error } = useMyImpactSummary();
  const [shareCopied, setShareCopied] = useState(false);

  if (isLoading) {
    return (
      <PhoneShell title="Niyet etkim" back>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ny-card h-24 animate-pulse" />
          ))}
        </div>
      </PhoneShell>
    );
  }

  if (error || !impact) {
    return (
      <PhoneShell title="Niyet etkim" back>
        <p className="ny-tagline">Özet yüklenemedi.</p>
      </PhoneShell>
    );
  }

  const handleShare = async () => {
    const text = `Niyet ile bugüne kadar ${formatTRY(impact.totalContributedAllTime)} biriktirdim. Aylık potansiyelim ${formatTRY(impact.monthlyPotential)} — sen de dene!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Niyet etkim', text });
      } else {
        await navigator.clipboard?.writeText(text);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // kullanici iptal etti — sessiz devam
    }
  };

  return (
    <PhoneShell
      title="Niyet etkim"
      back
      rightSlot={
        <button
          onClick={handleShare}
          className="ny-chip flex items-center gap-1 !py-1 !text-[11px]"
          aria-label="Özeti paylaş"
        >
          <Share2 size={12} />
          {shareCopied ? 'Kopyalandı' : 'Paylaş'}
        </button>
      }
    >
      <p className="ny-tagline mb-4">
        Niyet&apos;in bugüne kadar sana sağladığı ölçülebilir değer.
      </p>

      {/* Hero: Toplam katki */}
      <section className="ny-tile-dark mb-3">
        <div className="text-xs uppercase tracking-wider text-white/60">Toplam mikro katkı</div>
        <div className="ny-tight mt-2 text-4xl font-semibold">
          {formatTRY(impact.totalContributedAllTime)}
        </div>
        <div className="mt-1 text-xs text-white/60">
          {impact.contributionCount} katkı · son 30 günde {formatTRY(impact.last30dContributed)}
        </div>
      </section>

      {/* 2x2 metrik grid */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <MetricCard
          icon={<TrendingUp size={12} className="text-emerald-600" />}
          label="Aylık potansiyel"
          value={formatTRY(impact.monthlyPotential)}
          subtitle="bugünkü hıza göre"
        />
        <MetricCard
          icon={<Sparkles size={12} className="text-amber-600" />}
          label="Yıllık potansiyel"
          value={formatTRY(impact.yearlyPotential)}
          subtitle="%5 getiri ile"
        />
        <ScoreCard
          score={impact.currentScore}
          delta={impact.scoreDelta}
          topDriverLabel={impact.topDriver?.metric ?? '—'}
        />
        <MetricCard
          icon={<Trophy size={12} className="text-violet-600" />}
          label="30 yıl projeksiyon"
          value={formatTRY(impact.thirtyYearProjection)}
          subtitle="aynı tempo + bileşik"
        />
      </div>

      {/* Top driver detayı */}
      {impact.topDriver && impact.topDriver.delta !== 0 && (
        <section className="ny-card mb-3 !p-3">
          <div className="ny-eyebrow mb-1">Skoru en çok etkileyen</div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{impact.topDriver.metric}</span>
            <DriverDirectionBadge
              direction={impact.topDriver.direction}
              delta={impact.topDriver.delta}
            />
          </div>
        </section>
      )}

      {/* Top kategori fırsatları */}
      {impact.topCategoryOpportunities.length > 0 && (
        <section className="ny-card mb-3 !p-3">
          <header className="mb-2 flex items-center gap-1.5">
            <Sparkles size={12} className="text-primary" />
            <h3 className="text-xs font-semibold">En güçlü fırsatların</h3>
          </header>
          <ul className="space-y-1.5">
            {impact.topCategoryOpportunities.map((c, i) => (
              <li
                key={c.category}
                className="flex items-center justify-between gap-2 rounded-md bg-[hsl(var(--divider-soft))]/40 p-2"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-lg">{CATEGORY_LABEL[c.category]?.icon}</span>
                  <span className="text-xs font-semibold">
                    {CATEGORY_LABEL[c.category]?.label ?? c.category}
                  </span>
                </span>
                <span className="text-primary text-sm font-semibold">
                  +{formatTRY(c.opportunity)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] opacity-60">
            Son 30 günün azaltılabilir kategori sıralaması.
          </p>
        </section>
      )}

      {/* Sosyal aktivite */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => router.push('/goals')}
          className="ny-card flex items-center gap-2 !p-3 text-left"
          aria-label="Aktif hedefler"
        >
          <Target size={14} className="text-primary" />
          <div className="flex-1">
            <div className="text-[10px] opacity-60">Aktif hedef</div>
            <div className="text-sm font-semibold">{impact.activeGoalCount}</div>
          </div>
        </button>
        <button
          onClick={() => router.push('/circles')}
          className="ny-card flex items-center gap-2 !p-3 text-left"
          aria-label="Çemberler"
        >
          <Users size={14} className="text-violet-600" />
          <div className="flex-1">
            <div className="text-[10px] opacity-60">Çember</div>
            <div className="text-sm font-semibold">{impact.circleCount}</div>
          </div>
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] opacity-60">
        Bu sayfa her açılışta canlı veriyle yeniden hesaplanır.
      </p>
    </PhoneShell>
  );
}

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}

function MetricCard({ icon, label, value, subtitle }: MetricProps) {
  return (
    <div className="ny-card !p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase opacity-60">
        {icon} {label}
      </div>
      <div className="ny-tight mt-1.5 text-lg font-semibold">{value}</div>
      {subtitle && <div className="mt-0.5 text-[10px] opacity-50">{subtitle}</div>}
    </div>
  );
}

function ScoreCard({
  score,
  delta,
  topDriverLabel,
}: {
  score: number | null;
  delta: number;
  topDriverLabel: string;
}) {
  return (
    <div className="ny-card !p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase opacity-60">
        <Trophy size={12} className="text-emerald-600" /> Gelecek Skoru
      </div>
      <div className="ny-tight mt-1.5 flex items-baseline gap-1 text-lg font-semibold">
        {score ?? '—'}
        {delta !== 0 && (
          <span
            className={`text-[10px] font-bold ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
      <div className="mt-0.5 truncate text-[10px] opacity-50">{topDriverLabel}</div>
    </div>
  );
}

function DriverDirectionBadge({
  direction,
  delta,
}: {
  direction: UserImpactSummary['topDriver']['direction'];
  delta: number;
}) {
  if (direction === 'UP') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
        <ArrowUpRight size={10} /> +{delta}
      </span>
    );
  }
  if (direction === 'DOWN') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
        <ArrowDownRight size={10} /> {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--divider-soft))] px-2 py-0.5 text-[10px] font-bold opacity-70">
      <Minus size={10} /> Sabit
    </span>
  );
}
