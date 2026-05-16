'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { PhoneShell } from '@/components/phone-shell';
import { useFinanceNewsItem } from '@/lib/graphql/queries';

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const { data, isLoading } = useFinanceNewsItem(id);
  const item = data?.financeNewsItem;
  const insight = item ? buildInsight(item.title) : null;

  return (
    <PhoneShell title="Haber Detayı" back>
      {isLoading ? (
        <div className="space-y-3">
          <div className="ny-card h-28 animate-pulse" />
          <div className="ny-card h-40 animate-pulse" />
        </div>
      ) : !item ? (
        <div className="ny-card text-center">
          <p className="ny-tagline">Haber bulunamadı.</p>
          <Link href="/news" className="text-primary mt-2 inline-block text-sm font-semibold">
            Haber akışına dön
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="ny-card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold opacity-70">{item.sourceName}</span>
              <span className="text-xs opacity-60">
                {new Date(item.publishedAt).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-snug">{item.title}</h2>
            <div className="mt-3 rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-3">
              <div className="text-xs font-semibold opacity-60">Kısa özet</div>
              <p className="mt-1 text-sm opacity-85">{item.summaryShort}</p>
            </div>
            {insight ? (
              <div className="mt-2 space-y-2">
                <div className="rounded-xl border border-[hsl(var(--hairline))] p-3">
                  <div className="text-xs font-semibold opacity-60">Neden önemli?</div>
                  <p className="mt-1 text-sm opacity-85">{insight.whyImportant}</p>
                </div>
                <div className="rounded-xl border border-[hsl(var(--hairline))] p-3">
                  <div className="text-xs font-semibold opacity-60">Olası etki</div>
                  <p className="mt-1 text-sm opacity-85">{insight.impact}</p>
                </div>
              </div>
            ) : null}
            {item.isImportant ? (
              <span className="border-primary text-primary mt-3 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                Önemli gelişme
              </span>
            ) : null}
          </div>

          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ny-pill block w-full text-center"
          >
            Kaynağa git
          </a>
        </div>
      )}
    </PhoneShell>
  );
}

function buildInsight(title: string): { whyImportant: string; impact: string } | null {
  const t = title.toLowerCase();
  if (t.includes('enflasyon') || t.includes('tüfe')) {
    return {
      whyImportant:
        'Enflasyon haberleri alım gücü, maaş artışları ve tasarruf hedeflerinin gerçek maliyetini doğrudan etkiler.',
      impact:
        'Yüksek enflasyon beklentisi varsa hedef tutarlarını ve aylık katkı planını güncellemek gerekebilir.',
    };
  }
  if (
    t.includes('faiz') ||
    t.includes('tcmb') ||
    t.includes('ppk') ||
    t.includes('merkez bankası')
  ) {
    return {
      whyImportant:
        'Faiz/TCMB kararları kredi maliyetini, mevduat getirisini ve piyasa fiyatlamasını etkileyen ana sinyallerdendir.',
      impact:
        'Kısa vadede piyasa oynaklığı artabilir; bütçe ve birikim kararlarında daha temkinli kalmak faydalı olur.',
    };
  }
  if (t.includes('dolar') || t.includes('kur') || t.includes('rezerv')) {
    return {
      whyImportant:
        'Kur ve rezerv haberleri ithal ürün fiyatlarını ve genel fiyat seviyesini etkileyebilecek göstergelerdir.',
      impact:
        'Döviz hassasiyeti yüksek hedeflerde maliyet değişimi hızlanabilir; hedef fiyat güncellemeleri yakından izlenmeli.',
    };
  }
  return {
    whyImportant: 'Bu gelişme finansal gündemde yön belirleyici olabilecek bir sinyal içeriyor.',
    impact: 'Kısa vadede harcama, birikim ve hedef planını gözden geçirmek için referans olabilir.',
  };
}
