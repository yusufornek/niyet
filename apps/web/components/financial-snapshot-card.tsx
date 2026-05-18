'use client';

/**
 * FinancialSnapshotCard — Dashboard üst kısmında "tek bakışta finansal durum".
 *
 * PBI: "Ana ekranda harcama fırsatlarımı, Gelecek Skoru'mu ve katkı durumumu
 * tek bakışta görmek istiyorum; böylece finansal durumumu hızlıca anlayabilirim."
 *
 * Tasarım:
 * - Bu 3 metrik zaten Dashboard'da farklı yerlerde vardı (hero başlık + ScoreCard
 *   içinde 4 mini-stat + alt kart). Bu component üç ayrı kaynağı **tek satırda**
 *   birleştirir — kullanıcı sayfaya girdiği anda kritik finansal bilgiyi görür.
 * - Pure presentation — kendi veri çekmez, prop ile alır. Dashboard veri akışını
 *   bozmadan eklemek için.
 * - Tıklanabilir: her metrik ilgili sayfaya yönlendirir (radar/score/contributions).
 */
import { ArrowDownRight, ArrowUpRight, Minus, PiggyBank, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';

import { formatTRY } from '@/lib/utils';

interface SnapshotProps {
  /// Son 30 günün toplam azaltılabilir tutarı
  opportunityLast30d: number;
  /// Gelecek Skoru (0-100). null ise hiç hesaplanmamış.
  futureScore: number | null;
  /// Önceki snapshot'a göre delta (artı/eksi/0)
  scoreDelta: number;
  /// Tüm zamanlardaki kabul edilen katkı (COMMITTED + PENDING, REVERSED hariç)
  totalAccepted: number;
  /// İsteğe bağlı yükleniyor durumu — skeleton göster
  loading?: boolean;
}

export function FinancialSnapshotCard({
  opportunityLast30d,
  futureScore,
  scoreDelta,
  totalAccepted,
  loading,
}: SnapshotProps) {
  if (loading) {
    return (
      <div className="ny-card mb-3 grid grid-cols-3 gap-2 !p-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-[hsl(var(--divider-soft))]" />
        ))}
      </div>
    );
  }

  return (
    <section className="ny-card mb-3 !p-3" aria-label="Finansal durum özeti">
      <div className="ny-eyebrow mb-2">Bir bakışta</div>
      <div className="grid grid-cols-3 gap-2">
        <SnapshotTile
          href="/radar"
          icon={<Sparkles size={11} className="text-amber-600" />}
          label="Bu ay fırsat"
          value={formatTRY(opportunityLast30d)}
          tone="amber"
          aria="Tasarruf Radarı'na git"
        />
        <SnapshotTile
          href="/score"
          icon={<Trophy size={11} className="text-emerald-700" />}
          label="Gelecek Skoru"
          value={futureScore != null ? String(futureScore) : '—'}
          accessory={<ScoreDelta delta={scoreDelta} />}
          tone="emerald"
          aria="Gelecek Skoru detayı"
        />
        <SnapshotTile
          href="/contributions"
          icon={<PiggyBank size={11} className="text-primary" />}
          label="Toplam katkı"
          value={formatTRY(totalAccepted)}
          tone="primary"
          aria="Katkı geçmişi"
        />
      </div>
    </section>
  );
}

interface TileProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  accessory?: React.ReactNode;
  tone: 'amber' | 'emerald' | 'primary';
  aria: string;
}

function SnapshotTile({ href, icon, label, value, accessory, aria }: TileProps) {
  return (
    <Link
      href={href as `/${string}`}
      className="group flex flex-col rounded-lg border border-[hsl(var(--hairline))] bg-white p-2 transition-colors hover:bg-[hsl(var(--divider-soft))]/40"
      aria-label={aria}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-60">
        {icon} {label}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-sm font-semibold leading-tight">{value}</span>
        {accessory}
      </div>
    </Link>
  );
}

function ScoreDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[9px] opacity-50">
        <Minus size={9} />
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700">
        <ArrowUpRight size={9} />+{delta}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-700">
      <ArrowDownRight size={9} />
      {delta}
    </span>
  );
}
