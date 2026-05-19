'use client';

/**
 * FinancialSnapshotCard — Dashboard üst kısmında "tek bakışta finansal durum".
 *
 * PBI: "Ana ekranda harcama fırsatlarımı, Gelecek Skoru'mu ve katkı durumumu
 * tek bakışta görmek istiyorum."
 *
 * Tasarım (kullanıcı isteği 2026-05-19): uiverse.io kawaii-range slider'ları ile
 * 3 metrik. Slider'lar görsel-only (`pointer-events: none`); her satır clickable
 * Link içinde → tıklayınca ilgili detay sayfasına yönlendirir.
 *
 * Renkler:
 *   - Fırsat → amber (#f59e0b)
 *   - Skor   → emerald (#10b981)
 *   - Katkı  → primary (#0066cc, Niyet Action Blue)
 *
 * Slider yüzdeleri (görsel anlam):
 *   - Skor: doğrudan 0-100
 *   - Fırsat: monthly opportunity / 5000 ₺ baseline
 *   - Katkı: lifetime total / 100000 ₺ baseline
 */
import { ArrowDownRight, ArrowUpRight, Minus, PiggyBank, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';

import { formatTRY } from '@/lib/utils';

import './snapshot-range.css';

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

const OPPORTUNITY_BASELINE = 5000;
const ACCEPTED_BASELINE = 100000;

export function FinancialSnapshotCard({
  opportunityLast30d,
  futureScore,
  scoreDelta,
  totalAccepted,
  loading,
}: SnapshotProps) {
  if (loading) {
    return (
      <div className="ny-card mb-3 space-y-3 !p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-[hsl(var(--divider-soft))]" />
        ))}
      </div>
    );
  }

  const opportunityPct = clamp01((opportunityLast30d / OPPORTUNITY_BASELINE) * 100);
  const scorePct = clamp01(futureScore ?? 0);
  const acceptedPct = clamp01((totalAccepted / ACCEPTED_BASELINE) * 100);

  return (
    <section className="ny-card mb-3 !p-4" aria-label="Finansal durum özeti">
      <div className="ny-eyebrow mb-3">Bir bakışta</div>
      <div className="space-y-3">
        <KawaiiRow
          href="/radar"
          label="Bu ay fırsat"
          value={formatTRY(opportunityLast30d)}
          icon={<Sparkles size={12} className="text-amber-600" />}
          percent={opportunityPct}
          color="#f59e0b"
          aria="Tasarruf Radarı'na git"
        />
        <KawaiiRow
          href="/score"
          label="Gelecek Skoru"
          value={futureScore != null ? String(futureScore) : '—'}
          accessory={<ScoreDelta delta={scoreDelta} />}
          icon={<Trophy size={12} className="text-emerald-700" />}
          percent={scorePct}
          color="#10b981"
          aria="Gelecek Skoru detayı"
        />
        <KawaiiRow
          href="/contributions"
          label="Toplam katkı"
          value={formatTRY(totalAccepted)}
          icon={<PiggyBank size={12} className="text-primary" />}
          percent={acceptedPct}
          color="#0066cc"
          aria="Katkı geçmişi"
        />
      </div>
    </section>
  );
}

interface RowProps {
  href: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  percent: number; // 0-100
  color: string;
  accessory?: React.ReactNode;
  aria: string;
}

function KawaiiRow({ href, label, value, icon, percent, color, accessory, aria }: RowProps) {
  return (
    <Link
      href={href as `/${string}`}
      className="block rounded-2xl transition-opacity hover:opacity-90"
      aria-label={aria}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-60">
          {icon} {label}
        </span>
        <span className="flex items-baseline gap-1.5 text-sm font-semibold">
          {value}
          {accessory}
        </span>
      </div>
      <input
        type="range"
        className="kawaii-range"
        min={0}
        max={100}
        value={Math.round(percent)}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        style={{ ['--base' as string]: color }}
      />
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(100, value));
}
