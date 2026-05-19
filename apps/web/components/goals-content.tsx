'use client';

/**
 * GoalsContent — hedefler sayfasının PhoneShell'siz çekirdeği + donut chart.
 *
 * PBI: "hedeflerime de radardaki gibi yuvarlak grafiklerle gosterelim" —
 * her hedef için ayrı medium donut + center'da % progresi gösterilir.
 * Mevcut linear bar kart icinde alta tasindi.
 */
import { Search, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  type ProductSearchResult,
  useCreateGoal,
  useGoals,
  useLatestInflationRate,
  useNormalizeGoalProductQuery,
  useSearchGoalProducts,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

export function GoalsContent() {
  const router = useRouter();
  const { data, isLoading } = useGoals();
  const { data: inflationData } = useLatestInflationRate();
  const createGoal = useCreateGoal();
  const normalizeQuery = useNormalizeGoalProductQuery();
  const searchProducts = useSearchGoalProducts();

  const [name, setName] = useState('');
  const [target, setTarget] = useState(50000);
  const [year, setYear] = useState('2030');
  const [rawQuery, setRawQuery] = useState('');
  const [normalizedQuery, setNormalizedQuery] = useState('');
  const [normalizedCategory, setNormalizedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);

  const goals = data?.goals ?? [];
  const tuikInflation = inflationData?.latestInflationRate ?? null;

  const handleSearch = async () => {
    const query = rawQuery.trim();
    if (!query) return;
    try {
      const normalized = await normalizeQuery.mutateAsync(query);
      const normalizedProductQuery = normalized.normalizeGoalProductQuery.normalizedQuery;
      setNormalizedQuery(normalizedProductQuery);
      setNormalizedCategory(normalized.normalizeGoalProductQuery.category ?? null);
      const search = await searchProducts.mutateAsync(normalizedProductQuery);
      setProducts(search.searchGoalProducts);
      if (search.searchGoalProducts.length > 0) {
        setSelectedProduct(search.searchGoalProducts[0] ?? null);
      }
    } catch {
      // hata zaten toast ile gösteriliyor (queries.ts onError)
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    const targetDate = new Date(`${year}-12-31T00:00:00.000Z`).toISOString();
    const result = await createGoal.mutateAsync({
      name,
      basePrice: target,
      targetDate,
      inflationPct: tuikInflation?.annualRate,
      monthlyContribution: Math.max(250, Math.round(target / 120)),
      tracking:
        selectedProduct && normalizedQuery
          ? {
              rawQuery: rawQuery.trim(),
              normalizedQuery,
              category: normalizedCategory,
              selectedProductTitle: selectedProduct.title,
              productUrl: selectedProduct.url,
              productImage: selectedProduct.image,
              productSource: selectedProduct.source,
              price: selectedProduct.price,
              currency: selectedProduct.currency,
            }
          : undefined,
    });
    setName('');
    setRawQuery('');
    setNormalizedQuery('');
    setNormalizedCategory(null);
    setProducts([]);
    setSelectedProduct(null);
    router.push(`/goals/${result.createGoal.id}`);
  };

  return (
    <>
      {/* Hedefler — tam genislik stack kartlar */}
      {isLoading ? (
        <div className="mb-5 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="ny-card h-36 animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="ny-card mb-5 !p-6 text-center">
          <div className="text-sm opacity-70">Henüz hedef yok. Aşağıdan yeni bir tane oluştur.</div>
        </div>
      ) : (
        <div className="mb-5 space-y-3">
          {goals.map((g) => {
            const pct = Math.min(100, (g.current / g.currentPrice) * 100);
            const drift = Math.round(((g.currentPrice - g.basePrice) / g.basePrice) * 100);
            const remaining = Math.max(0, g.currentPrice - g.current);
            const monthsToGoal =
              g.monthlyContribution > 0 ? Math.ceil(remaining / g.monthlyContribution) : null;
            return (
              <Link key={g.id} href={`/goals/${g.id}`} className="ny-card block !p-4">
                {/* Üst: ad + yıl */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="text-base font-semibold leading-tight">{g.name}</div>
                  <span className="shrink-0 rounded-full bg-[hsl(var(--divider-soft))] px-2 py-0.5 text-[10px] font-semibold opacity-70">
                    {new Date(g.targetDate).getFullYear()}
                  </span>
                </div>

                {/* Orta: donut + tutar */}
                <div className="flex items-center gap-4">
                  <GoalDonut pct={pct} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wide opacity-60">Biriken</div>
                    <div className="ny-tight mt-0.5 text-xl font-semibold">
                      {formatTRY(g.current)}
                    </div>
                    <div className="text-[11px] opacity-60">
                      / {formatTRY(g.currentPrice)} hedef
                    </div>
                  </div>
                </div>

                {/* Alt: detay rozet satırı */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.monthlyContribution > 0 && (
                    <span className="rounded-full bg-[hsl(var(--divider-soft))] px-2 py-0.5 text-[10px]">
                      Aylık {formatTRY(g.monthlyContribution)}
                    </span>
                  )}
                  {monthsToGoal != null && monthsToGoal < 999 && (
                    <span className="rounded-full bg-[hsl(var(--divider-soft))] px-2 py-0.5 text-[10px]">
                      ~{monthsToGoal} ay kaldı
                    </span>
                  )}
                  {remaining > 0 && (
                    <span className="rounded-full bg-[hsl(var(--divider-soft))] px-2 py-0.5 text-[10px]">
                      {formatTRY(remaining)} eksik
                    </span>
                  )}
                  {drift > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      <TrendingUp size={9} /> +%{drift} fiyat
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="ny-card">
        <div className="ny-eyebrow mb-3">Yeni hedef</div>
        <div className="mb-3 flex flex-wrap gap-2">
          {['Emeklilik', 'Eğitim', 'Ev peşinatı', 'Araç', 'Tatil', 'Özel'].map((p) => (
            <button
              key={p}
              onClick={() => setName(p)}
              className={`ny-chip ${name === p ? 'border-primary text-primary' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hedef adı"
          className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />
        <label className="mb-1 block text-xs opacity-60">Hedef tutar (₺)</label>
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(+e.target.value)}
          className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />
        <label className="mb-1 block text-xs opacity-60">Hedef yılı</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="mb-3 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />

        <label className="mb-1 block text-xs opacity-60">Takip edilecek ürün (opsiyonel)</label>
        <input
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder="örn. iphone 15 128 gb"
          className="mb-2 w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
        />
        {normalizedQuery && (
          <div className="mb-2 rounded-xl border border-[hsl(var(--hairline))] p-2 text-xs">
            <div className="font-semibold">Sorgu: {normalizedQuery}</div>
            {normalizedCategory && <div className="opacity-70">Kategori: {normalizedCategory}</div>}
          </div>
        )}
        <button
          onClick={handleSearch}
          disabled={!rawQuery || normalizeQuery.isPending || searchProducts.isPending}
          className="ny-chip mb-3"
        >
          <Search size={14} className="mr-1 inline" />
          {normalizeQuery.isPending || searchProducts.isPending ? 'Aranıyor...' : 'Ürün ara'}
        </button>
        {products.length > 0 && (
          <div className="mb-3 max-h-48 space-y-2 overflow-auto">
            {products.map((product) => {
              const active = selectedProduct?.url === product.url;
              return (
                <button
                  key={product.url}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full rounded-xl border p-2 text-left text-xs ${
                    active ? 'border-primary bg-primary/5' : 'border-[hsl(var(--hairline))]'
                  }`}
                >
                  <div className="font-semibold">{product.title}</div>
                  <div className="opacity-70">
                    {formatTRY(product.price)} • {product.source}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!name || createGoal.isPending}
          className="ny-pill w-full disabled:opacity-50"
        >
          {createGoal.isPending ? 'Oluşturuluyor…' : 'Hedef oluştur'}
        </button>
      </div>
    </>
  );
}

/**
 * Hedef ilerleme donut'u — radardaki kategori donut'u ile aynı estetik,
 * tek arc + center'da yüzde.
 */
function GoalDonut({ pct }: { pct: number }) {
  const R = 44;
  const STROKE = 11;
  const C = 2 * Math.PI * R;
  const safePct = Math.max(0, Math.min(100, pct));
  const dash = (safePct / 100) * C;
  const gap = C - dash;
  // Renk: 0-30 sky, 30-70 amber, 70-100 emerald
  const color = pct >= 70 ? '#059669' : pct >= 30 ? '#d97706' : '#0284c7';
  return (
    <div className="relative h-[112px] w-[112px] shrink-0">
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={R}
          fill="none"
          stroke="hsl(var(--divider-soft))"
          strokeWidth={STROKE}
        />
        <circle
          cx="56"
          cy="56"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-bold leading-none" style={{ color }}>
          %{Math.round(safePct)}
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-wide opacity-50">ilerleme</div>
      </div>
    </div>
  );
}
