'use client';

import {
  CreditCard,
  GraduationCap,
  History as HistoryIcon,
  ListChecks,
  Newspaper,
  Pause,
  PiggyBank,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { FinancialSnapshotCard } from '@/components/financial-snapshot-card';
import { PhoneShell } from '@/components/phone-shell';
import { MonthlyTargetWidget } from '@/components/monthly-target-widget';
import { RulesWidget } from '@/components/rules-widget';
import { SavingsProjectionWidget } from '@/components/savings-projection-widget';
import { ScoreCard } from '@/components/score-card';
import {
  useDashboard,
  useFutureScoreInsights,
  useGoals,
  useMe,
  useSubscriptionSummary,
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
  const { data: subData } = useSubscriptionSummary();

  const userName = me?.me?.name?.split(' ')[0] ?? '';
  const goal = goalsData?.goals[0];
  const dashboard = dash?.dashboard;
  const score = scoreData?.futureScoreInsights?.current;
  const scoreInsight = scoreData?.futureScoreInsights;
  const acceptedShown = dashboard?.acceptedContributionsLast30d ?? 0;
  const totalAccepted = dashboard?.totalAcceptedContributions ?? 0;

  return (
    <PhoneShell
      rightSlot={
        <Link href="/settings" aria-label="Ayarlar" className="p-1">
          <Settings size={20} className="opacity-70" />
        </Link>
      }
    >
      <div className="pb-4 pt-2">
        <div className="ny-eyebrow">Merhaba {userName || 'Niyetli'}</div>
        <h1 className="ny-h1 mt-1">
          {dashLoading
            ? 'Yükleniyor…'
            : `Bu ay ${formatTRY(dashboard?.totalOpportunityLast30d ?? 0)} kurtarabilirsin.`}
        </h1>
      </div>

      <FinancialSnapshotCard
        opportunityLast30d={dashboard?.totalOpportunityLast30d ?? 0}
        futureScore={score?.score ?? null}
        scoreDelta={scoreInsight?.delta ?? 0}
        totalAccepted={totalAccepted}
        loading={dashLoading}
      />

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

      <div className="mb-3">
        <SavingsProjectionWidget />
      </div>

      <MonthlyTargetWidget />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <Link href="/radar" className="ny-card text-left">
          <div className="ny-eyebrow">Fırsat</div>
          <div className="mt-1 text-2xl font-semibold">
            {formatTRY(dashboard?.totalOpportunityLast30d ?? 0)}
          </div>
          <div className="mt-1 text-xs opacity-60">azaltılabilir harcama</div>
        </Link>
        <Link href="/rule" className="ny-card text-left">
          <div className="ny-eyebrow">Önerilen katkı</div>
          <div className="text-primary mt-1 text-2xl font-semibold">
            {formatTRY(Math.round((dashboard?.totalOpportunityLast30d ?? 0) * 0.3))}
          </div>
          <div className="mt-1 text-xs opacity-60">bu ay</div>
        </Link>
      </div>

      <Link href="/contributions" className="ny-card mb-3 block w-full text-left">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="ny-eyebrow">Mikro emeklilik katkıları</div>
            {totalAccepted > 0 ? (
              <>
                <div className="text-primary mt-1 text-xl font-semibold">
                  {formatTRY(totalAccepted)}
                </div>
                <div className="text-xs opacity-60">
                  toplam aktarıldı · son 30 gün {formatTRY(acceptedShown)}
                </div>
              </>
            ) : (
              <>
                <div className="mt-1 text-sm font-semibold">İlk katkını yap</div>
                <div className="text-xs opacity-60">
                  Tasarruf Radarı&apos;ndan azaltılabilir bir harcamayı emekliliğine aktar
                </div>
              </>
            )}
          </div>
          <div className="text-2xl">💰</div>
        </div>
      </Link>

      <Link href="/history" className="ny-card mb-3 block w-full text-left">
        <div className="flex items-center justify-between">
          <div>
            <div className="ny-eyebrow">AI Analiz Geçmişi</div>
            <div className="mt-1 text-sm font-semibold">Tasarruf fırsatlarını incele</div>
            <div className="text-xs opacity-60">Trend, kategori grup ve karar geçmişi</div>
          </div>
          <div className="text-2xl">📈</div>
        </div>
      </Link>

      {(subData?.subscriptionSummary?.activeCount ?? 0) > 0 && (
        <Link href="/subscriptions" className="ny-card mb-3 block w-full text-left">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="ny-eyebrow">Aboneliklerin</div>
              <div className="mt-1 text-xl font-semibold">
                {formatTRY(subData?.subscriptionSummary?.activeMonthlyTotal ?? 0)}
                <span className="text-sm opacity-60"> /ay</span>
              </div>
              <div className="text-xs opacity-60">
                {subData?.subscriptionSummary?.activeCount} aktif
                {(subData?.subscriptionSummary?.cancellableCount ?? 0) > 0 && (
                  <>
                    {' · '}
                    <span className="text-primary font-semibold">
                      {subData?.subscriptionSummary?.cancellableCount} iptal adayı (yıllık +
                      {formatTRY(subData?.subscriptionSummary?.potentialYearlySavings ?? 0)})
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-2xl">📺</div>
          </div>
        </Link>
      )}

      {goal && (
        <Link href="/goals" className="ny-card mb-3 block w-full text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="ny-eyebrow">Aktif hedef</div>
              <div className="mt-1 font-semibold">{goal.name}</div>
            </div>
            <div className="text-sm opacity-60">
              {Math.round((goal.current / goal.currentPrice) * 100)}%
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--divider-soft))]">
            <div
              className="bg-primary h-full"
              style={{ width: `${(goal.current / goal.currentPrice) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-xs opacity-60">
            {formatTRY(goal.current)} / {formatTRY(goal.currentPrice)}
          </div>
        </Link>
      )}

      <div className="mb-3">
        <RulesWidget />
      </div>

      <div className="ny-eyebrow mb-2 mt-5">Hızlı erişim</div>
      <div className="mb-3 grid grid-cols-3 gap-3">
        <QuickTile icon={<PiggyBank size={18} />} label="Katkılar" href="/contributions" />
        <QuickTile icon={<ListChecks size={18} />} label="İşlemler" href="/transactions" />
        <QuickTile icon={<HistoryIcon size={18} />} label="Analizler" href="/history" />
        <QuickTile icon={<CreditCard size={18} />} label="Abonelik" href="/subscriptions" />
        <QuickTile icon={<Users size={18} />} label="Çemberler" href="/circles" />
        <QuickTile icon={<Pause size={18} />} label="Nefes ayı" href="/pause" />
        <QuickTile icon={<GraduationCap size={18} />} label="Öğren" href="/learn" />
        <QuickTile icon={<Newspaper size={18} />} label="Haberler" href="/news" />
        <QuickTile icon={<TrendingUp size={18} />} label="Fonlar" href="/funds" />
      </div>

      <div className="ny-card mb-3">
        <div className="ny-eyebrow">Son 30 gün</div>
        <div className="mt-2 text-sm">
          {dashboard?.txCountLast30d ?? 0} işlem · Toplam{' '}
          <span className="font-semibold">{formatTRY(dashboard?.totalSpentLast30d ?? 0)}</span>
        </div>
      </div>

      <Link href="/demo-result" className="ny-pill-ghost block w-full text-center">
        Demo özetini gör
      </Link>
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
