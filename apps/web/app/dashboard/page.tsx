'use client';

/**
 * Dashboard — ana sayfa.
 *
 * Tasarım hedefi: SADE. Detay sayfalarının çoğunluğu /menu'ye taşındı; burada
 * sadece "tek bakışta görmek istediğim özet" bilgi kalır:
 *   - Header: Bell (okunmamış bildirim badge'i) + isim + Settings
 *   - Hero başlık: bu ay azaltılabilir tutar
 *   - Pause banner (conditional)
 *   - FinancialSnapshotCard: 3 metrik (fırsat / skor / katkı)
 *   - MonthlyTargetWidget: aylık katkı hedefi + ilerleme
 *   - Aktif Hedef kartı (donut + Devam et CTA)
 *
 * Kaldırılan modüller (artık /menu üzerinden):
 *   - ScoreCard büyük kart (snapshot'ta skor zaten var, detay /score)
 *   - SavingsProjectionWidget (detay /impact)
 *   - "Niyet etkim" link (menüde Analiz altında)
 *   - 2-col grid (Fırsat / Önerilen katkı) — snapshot kapsar
 *   - Mikro Emeklilik / AI Analiz / Abonelikler / Goal / Rules link kartları
 *   - 3x3 hızlı erişim grid (menüde tümü)
 *   - Demo özetini gör butonu (menüde Hızlı Erişim'de)
 */
import { Bell, Pause, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FinancialSnapshotCard } from '@/components/financial-snapshot-card';
import { MonthlyTargetWidget } from '@/components/monthly-target-widget';
import { PhoneShell } from '@/components/phone-shell';
import { ScoreCard } from '@/components/score-card';
import { Spinner } from '@/components/spinner';
import {
  useDashboard,
  useFutureScoreInsights,
  useGoals,
  useMe,
  useNotifications,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const pauseStatus = me?.me?.pauseStatus;
  const paused = pauseStatus?.isPaused ?? false;
  const { data: dash, isLoading: dashLoading } = useDashboard();
  const { data: goalsData } = useGoals();
  const { data: scoreData } = useFutureScoreInsights();

  const userName = me?.me?.name?.split(' ')[0] ?? '';
  const goal = goalsData?.goals[0];
  const dashboard = dash?.dashboard;
  const score = scoreData?.futureScoreInsights?.current;
  const scoreInsight = scoreData?.futureScoreInsights;
  const acceptedShown = dashboard?.acceptedContributionsLast30d ?? 0;
  const totalAccepted = dashboard?.totalAcceptedContributions ?? 0;

  return (
    <PhoneShell
      leftSlot={<NotificationBell />}
      rightSlot={
        <Link href="/settings" aria-label="Ayarlar" className="p-1">
          <Settings size={20} className="opacity-70" />
        </Link>
      }
    >
      <div className="pb-4 pt-2" data-tour="welcome-hero">
        <div className="ny-eyebrow">Merhaba {userName || 'Niyetli'}</div>
        <h1 className="ny-h1 mt-1 flex items-center gap-2">
          {dashLoading ? (
            <>
              <Spinner size={28} />
              <span className="opacity-60">Yükleniyor…</span>
            </>
          ) : (
            `Bu ay ${formatTRY(dashboard?.totalOpportunityLast30d ?? 0)} kurtarabilirsin.`
          )}
        </h1>
      </div>

      <div data-tour="snapshot-card">
        <FinancialSnapshotCard
          opportunityLast30d={dashboard?.totalOpportunityLast30d ?? 0}
          futureScore={score?.score ?? null}
          scoreDelta={scoreInsight?.delta ?? 0}
          totalAccepted={totalAccepted}
          loading={dashLoading}
        />
      </div>

      {paused && (
        <div className="ny-card border-primary/30 mb-3 flex items-center gap-3">
          <Pause size={18} className="text-primary" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Katkıların duraklatıldı</div>
            {pauseStatus?.remainingDays != null && (
              <div className="text-xs opacity-70">{pauseStatus.remainingDays} gün daha duraklı</div>
            )}
          </div>
          <Link href="/pause" className="text-primary text-sm font-semibold">
            Yönet
          </Link>
        </div>
      )}

      <ScoreCard
        score={score?.score ?? 0}
        delta={scoreInsight?.delta ?? 0}
        title={scoreInsight?.label ?? 'İyi gidiyorsun'}
        subtitle="Üzerine gel — genel istatistiklerini gör."
        status={scoreInsight?.status ?? 'Sağlıklı finansal ritim'}
        onOpen={() => router.push('/score')}
        stats={[
          {
            label: 'Kabul edilen tasarruf',
            value: formatTRY(acceptedShown),
            foot: 'son 30 gün',
          },
          {
            label: 'Aktif kural',
            value: `${dashboard?.activeRulesCount ?? 0}`,
            foot: 'otomatik katkı',
          },
          {
            label: 'Hedef ilerleme',
            value: goal ? `${Math.round((goal.current / goal.currentPrice) * 100)}%` : '—',
            foot: goal?.name ?? 'hedef yok',
          },
          {
            label: 'Bu ay fırsat',
            value: formatTRY(dashboard?.totalOpportunityLast30d ?? 0),
            foot: 'azaltılabilir',
          },
        ]}
      />

      <div data-tour="monthly-target">
        <MonthlyTargetWidget />
      </div>

      {goal && <ActiveGoalCard goal={goal} />}

      <p className="mt-5 text-center text-[11px] opacity-50">
        Daha fazlası için alttaki <b>Menü</b> sekmesine bak.
      </p>
    </PhoneShell>
  );
}

/**
 * Aktif Hedef kompakt kart — donut + ad + tutarlar + Detay link.
 * Mevcut hedef detay sayfasına yönlendirir.
 */
function ActiveGoalCard({
  goal,
}: {
  goal: {
    id: string;
    name: string;
    current: number;
    currentPrice: number;
    monthlyContribution: number;
    targetDate: string;
  };
}) {
  const pct = Math.min(100, (goal.current / goal.currentPrice) * 100);
  const remaining = Math.max(0, goal.currentPrice - goal.current);
  const monthsToGoal =
    goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;
  return (
    <Link href={`/goals/${goal.id}`} className="ny-card mb-3 block !p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="ny-eyebrow">Aktif hedef</div>
        <span className="rounded-full bg-[hsl(var(--divider-soft))] px-2 py-0.5 text-[10px] font-semibold opacity-70">
          {new Date(goal.targetDate).getFullYear()}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <GoalMiniDonut pct={pct} />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold leading-tight">{goal.name}</div>
          <div className="mt-1 text-[11px] opacity-70">
            {formatTRY(goal.current)}{' '}
            <span className="opacity-50">/ {formatTRY(goal.currentPrice)}</span>
          </div>
          {monthsToGoal != null && monthsToGoal < 999 && (
            <div className="mt-0.5 text-[10px] opacity-50">~{monthsToGoal} ay kaldı</div>
          )}
        </div>
        <span className="text-primary text-xs">→</span>
      </div>
    </Link>
  );
}

function GoalMiniDonut({ pct }: { pct: number }) {
  const R = 32;
  const STROKE = 8;
  const C = 2 * Math.PI * R;
  const safePct = Math.max(0, Math.min(100, pct));
  const dash = (safePct / 100) * C;
  const gap = C - dash;
  const color = pct >= 70 ? '#059669' : pct >= 30 ? '#d97706' : '#0284c7';
  return (
    <div className="relative h-[80px] w-[80px] shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke="hsl(var(--divider-soft))"
          strokeWidth={STROKE}
        />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] font-bold"
        style={{ color }}
      >
        %{Math.round(safePct)}
      </div>
    </div>
  );
}

/**
 * Dashboard üst-sol bildirim zili — okunmamış varsa kırmızı badge sayısı.
 */
function NotificationBell() {
  const { data: notifData } = useNotifications(true);
  const unreadCount = notifData?.notifications?.length ?? 0;
  return (
    <Link
      href="/notifications"
      data-tour="notification-bell"
      aria-label={`Bildirimler${unreadCount > 0 ? ` (${unreadCount} okunmamış)` : ''}`}
      className="relative -ml-1 rounded-full p-1.5 hover:bg-black/5"
    >
      <Bell size={20} className="opacity-80" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
