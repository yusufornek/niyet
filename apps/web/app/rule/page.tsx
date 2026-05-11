'use client';

import { Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { categories, fmt, useApp } from '@/lib/stores/use-app';

export default function RulePage() {
  const router = useRouter();
  const addRule = useApp((s) => s.addRule);
  const selectedCategoryId = useApp((s) => s.selectedCategoryId);
  const [freq, setFreq] = useState('Aylık');
  const [amount, setAmount] = useState(750);
  const [salaryRule, setSalaryRule] = useState(true);
  const [diffRule, setDiffRule] = useState(true);
  const reducible = categories.filter((c) => c.reducible);
  const initial =
    (selectedCategoryId && reducible.find((c) => c.id === selectedCategoryId)?.id) ||
    reducible[0]!.id;
  const [diffCat, setDiffCat] = useState(initial);
  const diffCatName = reducible.find((c) => c.id === diffCat)?.name ?? '';
  return (
    <PhoneShell title="Mikro katkı" back>
      <div className="ny-tile-dark mb-4">
        <div className="text-xs uppercase tracking-wider text-white/60">Yıllık potansiyel</div>
        <div className="ny-tight mt-1 text-4xl font-semibold">{fmt(amount * 12)}</div>
        <div className="mt-1 text-sm text-white/60">Aylık {fmt(amount)} katkıyla</div>
      </div>

      <div className="ny-card mb-3">
        <div className="ny-eyebrow mb-2">Sıklık</div>
        <div className="flex gap-2">
          {['Tek seferlik', 'Haftalık', 'Aylık'].map((f) => (
            <button
              key={f}
              onClick={() => setFreq(f)}
              className={`ny-chip flex-1 justify-center ${
                freq === f ? 'border-primary text-primary' : ''
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="ny-card mb-3">
        <div className="ny-eyebrow mb-2">Tutar</div>
        <input
          type="range"
          min={100}
          max={3000}
          step={50}
          value={amount}
          onChange={(e) => setAmount(+e.target.value)}
          className="w-full accent-[hsl(var(--primary))]"
        />
        <div className="mt-1 flex justify-between text-xs opacity-60">
          <span>100 ₺</span>
          <span className="text-primary text-base font-semibold">{fmt(amount)}</span>
          <span>3.000 ₺</span>
        </div>
      </div>

      <Toggle
        label="Maaş günü 1.000 ₺ otomatik katkı"
        value={salaryRule}
        onChange={setSalaryRule}
      />

      <div className="ny-card mb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="pr-3 text-sm">Ortalamanın altında kalan farkı katkıya aktar</span>
          <button
            onClick={() => setDiffRule(!diffRule)}
            className={`h-7 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
              diffRule ? 'bg-primary' : 'bg-[hsl(var(--divider-soft))]'
            }`}
          >
            <span
              className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                diffRule ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </div>
        {diffRule && (
          <>
            <div className="ny-eyebrow mb-2 mt-3">Kategori</div>
            <div className="flex flex-wrap gap-2">
              {reducible.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDiffCat(c.id)}
                  className={`ny-chip ${diffCat === c.id ? 'border-primary text-primary' : ''}`}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs opacity-60">
              {diffCatName} ortalamanın altında kaldığında fark katkıya aktarılır.
            </p>
          </>
        )}
      </div>

      <p className="my-4 flex gap-2 text-xs opacity-60">
        <Info size={14} className="mt-0.5 shrink-0" /> Onayın olmadan hiçbir katkı işlemi
        başlatılmaz.
      </p>

      <button
        className="ny-pill w-full"
        onClick={() => {
          addRule({ label: `${freq} katkı`, amount: fmt(amount), freq });
          router.push('/goals');
        }}
      >
        Kuralı kaydet
      </button>
    </PhoneShell>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="ny-card mb-3 flex items-center justify-between">
      <span className="pr-3 text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`h-7 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
          value ? 'bg-primary' : 'bg-[hsl(var(--divider-soft))]'
        }`}
      >
        <span
          className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  );
}
