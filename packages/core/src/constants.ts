/**
 * 15 sabit Türkçe harcama kategorisi.
 * Prisma `SpendingCategory` enum'u ile birebir eş.
 */
export const SPENDING_CATEGORIES = [
  'MARKET',
  'FOOD_DELIVERY',
  'COFFEE',
  'DINING_OUT',
  'TRANSPORT',
  'FUEL',
  'BILLS',
  'SUBSCRIPTIONS',
  'ONLINE_SHOPPING',
  'CLOTHING',
  'HEALTH',
  'ENTERTAINMENT',
  'EDUCATION',
  'SPORTS',
  'OTHER',
] as const;

export type SpendingCategoryKey = (typeof SPENDING_CATEGORIES)[number];

export interface CategoryMeta {
  label: string;
  icon: string; // emoji veya lucide icon ad ı
  /// Tailwind text color class (text-[hsl(...)])
  color: string;
}

/// Kategori metadata haritası — UI tarafında ikon/renk eşlemesi için tek kaynak.
export const CATEGORY_META: Record<SpendingCategoryKey, CategoryMeta> = {
  MARKET: { label: 'Market', icon: '🛒', color: 'text-emerald-600' },
  FOOD_DELIVERY: { label: 'Yemek Siparişi', icon: '🛵', color: 'text-orange-500' },
  COFFEE: { label: 'Kahve', icon: '☕', color: 'text-amber-700' },
  DINING_OUT: { label: 'Dışarı Yemek', icon: '🍽', color: 'text-red-500' },
  TRANSPORT: { label: 'Ulaşım', icon: '🚇', color: 'text-blue-500' },
  FUEL: { label: 'Yakıt', icon: '⛽', color: 'text-amber-600' },
  BILLS: { label: 'Faturalar', icon: '🧾', color: 'text-slate-600' },
  SUBSCRIPTIONS: { label: 'Abonelikler', icon: '📺', color: 'text-violet-500' },
  ONLINE_SHOPPING: { label: 'Online Alışveriş', icon: '🛍', color: 'text-pink-500' },
  CLOTHING: { label: 'Giyim', icon: '👕', color: 'text-rose-400' },
  HEALTH: { label: 'Sağlık', icon: '💊', color: 'text-teal-600' },
  ENTERTAINMENT: { label: 'Eğlence', icon: '🎬', color: 'text-fuchsia-500' },
  EDUCATION: { label: 'Eğitim', icon: '📚', color: 'text-indigo-500' },
  SPORTS: { label: 'Spor', icon: '🏋️', color: 'text-cyan-600' },
  OTHER: { label: 'Diğer', icon: '✨', color: 'text-slate-500' },
};

/// Demo amaçlı azaltılabilir varsayılan kategoriler (Faz 5 öncesi UI için).
export const DEFAULT_REDUCIBLE_CATEGORIES: SpendingCategoryKey[] = [
  'COFFEE',
  'FOOD_DELIVERY',
  'DINING_OUT',
  'SUBSCRIPTIONS',
  'ONLINE_SHOPPING',
];

/// Türkçe lokal merchant pool (mock data + AI prompt için referans).
export const TURKISH_MERCHANTS: Record<SpendingCategoryKey, string[]> = {
  MARKET: ['Migros', 'A101', 'BİM', 'ŞOK', 'CarrefourSA', 'Macrocenter'],
  FOOD_DELIVERY: ['Yemeksepeti', 'Getir Yemek', 'Trendyol Yemek', 'Migros Hemen'],
  COFFEE: ['Starbucks', 'Espressolab', 'Kahve Dünyası', "Gloria Jean's", 'Coffy'],
  DINING_OUT: ['Burger King', "McDonald's", 'Köfteci Yusuf', 'Big Chefs', 'Bonchon'],
  TRANSPORT: ['İstanbulkart', 'BiTaksi', 'iTaksi', 'Uber', 'Marti'],
  FUEL: ['Shell', 'BP', 'Opet', 'Petrol Ofisi', 'Total'],
  BILLS: ['Türk Telekom', 'Vodafone', 'Turkcell', 'İGDAŞ', 'BEDAŞ', 'İSKİ'],
  SUBSCRIPTIONS: [
    'Netflix',
    'Spotify',
    'Disney+',
    'ChatGPT Plus',
    'YouTube Premium',
    'Apple One',
    'Notion',
    'iCloud',
  ],
  ONLINE_SHOPPING: ['Trendyol', 'Hepsiburada', 'Amazon TR', 'GittiGidiyor', 'N11'],
  CLOTHING: ['Zara', 'LC Waikiki', 'Koton', 'Mavi', 'DeFacto', 'Penti'],
  HEALTH: ['Eczane', 'Memorial', 'Acıbadem', 'Medical Park'],
  ENTERTAINMENT: ['Cinemaximum', 'Mars Cinema', 'Beyaz Adam', 'Biletinial'],
  EDUCATION: ['Udemy', 'D&R', 'Idefix', 'BAU Online'],
  SPORTS: ['Mac Fit', 'Fit Performance', 'Decathlon', 'Sportive'],
  OTHER: ['Diğer'],
};
