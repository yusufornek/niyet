'use client';

import Link from 'next/link';

import { PhoneShell } from '@/components/phone-shell';
import { useFinanceNewsFeed } from '@/lib/graphql/queries';

export default function NewsPage() {
  const { data, isLoading, error, isError } = useFinanceNewsFeed(30, false);
  const items = data?.financeNewsFeed ?? [];

  return (
    <PhoneShell title="Finans Haberleri" back>
      {isLoading ? (
        <div className="space-y-3">
          <div className="ny-card h-20 animate-pulse" />
          <div className="ny-card h-20 animate-pulse" />
          <div className="ny-card h-20 animate-pulse" />
        </div>
      ) : isError ? (
        <div className="ny-card text-center">
          <h2 className="mb-1 text-lg font-semibold">Haber akışı alınamadı</h2>
          <p className="ny-tagline">
            {error instanceof Error ? error.message : 'Geçici bir hata oluştu.'}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="ny-card text-center">
          <h2 className="mb-1 text-lg font-semibold">Henüz haber yok</h2>
          <p className="ny-tagline">Kısa finans gündemi bu alanda görünecek.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/news/${item.id}`} className="ny-card block">
              <div className="mb-1 flex items-center justify-between gap-2">
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
              <div className="text-sm font-semibold">{item.title}</div>
              <p className="mt-1 text-sm opacity-70">{item.summaryShort}</p>
              <div className="mt-2 flex items-center justify-between">
                {item.isImportant ? (
                  <span className="border-primary text-primary rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                    Önemli
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-primary text-xs font-semibold">Detayı gör →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PhoneShell>
  );
}
