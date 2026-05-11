'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { categories, fmt, useApp } from '@/lib/stores/use-app';

export default function CategoryPage() {
  const router = useRouter();
  const selectedCategoryId = useApp((s) => s.selectedCategoryId);
  const c = categories.find((x) => x.id === selectedCategoryId) ?? categories[0]!;
  const [cat, setCat] = useState(c.name);
  const [feedback, setFeedback] = useState('');
  const cats = [
    'Kahve',
    'Dışarı yemek',
    'Market',
    'Eğlence',
    'Online alışveriş',
    'Ulaşım',
    'Abonelikler',
  ];
  return (
    <PhoneShell title={c.name} back>
      <div className="ny-tile-dark mb-4">
        <div className="text-xs uppercase tracking-wider text-white/60">Bu ay</div>
        <div className="ny-tight mt-1 text-4xl font-semibold">{fmt(c.spent)}</div>
        <div className="mt-1 text-sm text-white/60">Ortalama: {fmt(c.avg)}</div>
      </div>

      <div className="ny-card mb-4">
        <div className="ny-eyebrow">Yanlış kategori mi?</div>
        <p className="mb-3 mt-1 text-sm opacity-70">
          Sınıflandırmayı düzelt, analizler güncellenir.
        </p>
        <div className="flex flex-wrap gap-2">
          {cats.map((x) => (
            <button
              key={x}
              onClick={() => setCat(x)}
              className={`ny-chip ${cat === x ? 'border-primary text-primary' : ''}`}
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      <div className="ny-card mb-4">
        <div className="ny-eyebrow mb-2">Geri bildirim</div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Bu kategori için bir not bırak…"
          className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm outline-none"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="ny-pill" onClick={() => router.push('/rule')}>
          Kural oluştur
        </button>
        <button className="ny-pill-ghost" onClick={() => router.push('/radar')}>
          Kaydet
        </button>
      </div>
    </PhoneShell>
  );
}
