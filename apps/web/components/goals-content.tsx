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
      {/* Hedefler donut grid */}
      {isLoading ? (
        <div className="mb-5 space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="ny-card h-32 animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="ny-card mb-5 !p-6 text-center">
          <div className="text-sm opacity-70">Henüz hedef yok. Aşağıdan yeni bir tane oluştur.</div>
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = Math.min(100, (g.current / g.currentPrice) * 100);
            const drift = Math.round(((g.currentPrice - g.basePrice) / g.basePrice) * 100);
            return (
              <Link key={g.id} href={`/goals/${g.id}`} className="ny-card block">
                <div className="flex items-start gap-3">
                  <GoalDonut pct={pct} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-sm font-semibold">{g.name}</div>
                      <div className="shrink-0 text-[10px] opacity-60">
                        {new Date(g.targetDate).getFullYear()}
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] opacity-70">
                      {formatTRY(g.current)}{' '}
                      <span className="opacity-50">/ {formatTRY(g.currentPrice)}</span>
                    </div>
                    {drift > 0 && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                        <TrendingUp size={10} /> +%{drift} fiyat
                      </span>
                    )}
                  </div>
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

      <Link
        href={goals[0] ? `/funds?goalId=${goals[0].id}` : '/funds'}
        className="text-primary mt-5 block w-full text-center text-sm"
      >
        Fon seçeneklerini incele →
      </Link>
    </>
  );
}

/**
 * Hedef ilerleme donut'u — radardaki kategori donut'u ile aynı estetik,
 * tek arc + center'da yüzde.
 */
function GoalDonut({ pct }: { pct: number }) {
  const R = 28;
  const STROKE = 8;
  const C = 2 * Math.PI * R;
  const safePct = Math.max(0, Math.min(100, pct));
  const dash = (safePct / 100) * C;
  const gap = C - dash;
  // Renk: 0-30 sky, 30-70 amber, 70-100 emerald
  const color = pct >= 70 ? '#059669' : pct >= 30 ? '#d97706' : '#0284c7';
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={R}
          fill="none"
          stroke="hsl(var(--divider-soft))"
          strokeWidth={STROKE}
        />
        <circle
          cx="36"
          cy="36"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-bold">
        %{Math.round(safePct)}
      </div>
    </div>
  );
}
