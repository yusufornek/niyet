/**
 * Niyet — Demo persona seed scripti.
 *
 * Üretir:
 *  - Demo user "Ayşe" (22 yaş öğrenci, 8K ₺/ay)
 *  - 2 banka bağlantısı (Garanti BBVA debit + İş Bankası credit card)
 *  - 2 hesap
 *  - 90 günde ~300 transaction (Türk merchant'ları, gerçekçi pattern)
 *  - 4 abonelik (Netflix, Spotify, Disney+, ChatGPT Plus)
 *  - 2 rule (haftalık katkı + maaş günü)
 *  - 2 hedef (Yeni laptop + Yedek nakit)
 *  - 1 family circle (Aile birikimi)
 *  - 5 başlangıç Future Score snapshot'ı
 *
 * Idempotent: önce mevcut Ayşe'yi cascade sil, sonra yeniden yarat.
 * Seeded RNG ile deterministic — her run aynı 300 transaction'ı üretir.
 *
 * Çalıştırma: `bun --filter @niyet/db seed`
 */
import { Prisma, PrismaClient, type SpendingCategory } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// Seeded RNG — deterministic data üretimi için
// ─────────────────────────────────────────────────────────────
let _rngState = 1337;
const rng = () => {
  _rngState = (_rngState * 9301 + 49297) % 233280;
  return _rngState / 233280;
};
const rngInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const rngFloat = (min: number, max: number) => rng() * (max - min) + min;
const rngPick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;

// ─────────────────────────────────────────────────────────────
// Türkçe merchant havuzu
// ─────────────────────────────────────────────────────────────
const TURKISH_MERCHANTS: Record<SpendingCategory, string[]> = {
  MARKET: ['Migros', 'A101', 'BİM', 'ŞOK', 'CarrefourSA', 'Macrocenter'],
  FOOD_DELIVERY: ['Yemeksepeti', 'Getir Yemek', 'Trendyol Yemek', 'Migros Hemen'],
  COFFEE: ['Starbucks', 'Espressolab', 'Kahve Dünyası', "Gloria Jean's", 'Coffy'],
  DINING_OUT: ['Burger King', "McDonald's", 'Köfteci Yusuf', 'Big Chefs', 'Bonchon', 'Mado'],
  TRANSPORT: ['İstanbulkart', 'BiTaksi', 'iTaksi', 'Uber', 'Marti'],
  FUEL: ['Shell', 'BP', 'Opet', 'Petrol Ofisi'],
  BILLS: ['Türk Telekom', 'Vodafone', 'Turkcell', 'İGDAŞ', 'BEDAŞ', 'İSKİ'],
  SUBSCRIPTIONS: ['Netflix', 'Spotify', 'Disney Plus', 'ChatGPT Plus', 'YouTube Premium'],
  ONLINE_SHOPPING: ['Trendyol', 'Hepsiburada', 'Amazon TR', 'GittiGidiyor'],
  CLOTHING: ['Zara', 'LC Waikiki', 'Koton', 'Mavi', 'DeFacto', 'Penti'],
  HEALTH: ['Eczane Hayat', 'Acıbadem', 'Medical Park', 'Eczane Şifa'],
  ENTERTAINMENT: ['Cinemaximum', 'Mars Cinema', 'Biletinial', 'Beyaz Adam'],
  EDUCATION: ['Udemy', 'D&R', 'Idefix', 'BAU Online'],
  SPORTS: ['Mac Fit', 'Fit Performance', 'Decathlon'],
  OTHER: ['Manuel ödeme', 'Çiçekçi', 'Kuru temizleme'],
};

// ─────────────────────────────────────────────────────────────
// Ayşe'nin profili (ADR-006)
// 8.000 ₺/ay → 90 günde ~24.000 ₺ harcama
// ─────────────────────────────────────────────────────────────
type CategoryPattern = {
  category: SpendingCategory;
  frequencyPerMonth: number;
  amountRange: [number, number];
  weekendBoost?: number;
  reducible?: boolean;
  reducibleRate?: number; // ne kadarı reducible (0-1)
};

const SPENDING_PATTERNS: CategoryPattern[] = [
  // Reducible — Gemini'nin tasarruf önerisi vereceği kategoriler
  {
    category: 'COFFEE',
    frequencyPerMonth: 16,
    amountRange: [70, 130],
    reducible: true,
    reducibleRate: 0.6,
  },
  {
    category: 'FOOD_DELIVERY',
    frequencyPerMonth: 12,
    amountRange: [120, 280],
    weekendBoost: 1.6,
    reducible: true,
    reducibleRate: 0.5,
  },
  {
    category: 'DINING_OUT',
    frequencyPerMonth: 5,
    amountRange: [180, 450],
    weekendBoost: 1.4,
    reducible: true,
    reducibleRate: 0.3,
  },
  {
    category: 'ONLINE_SHOPPING',
    frequencyPerMonth: 4,
    amountRange: [200, 800],
    reducible: true,
    reducibleRate: 0.4,
  },
  {
    category: 'ENTERTAINMENT',
    frequencyPerMonth: 2,
    amountRange: [120, 300],
    weekendBoost: 1.8,
    reducible: true,
    reducibleRate: 0.25,
  },

  // Normal harcama — Gemini reducible işaretlemez
  { category: 'MARKET', frequencyPerMonth: 4, amountRange: [150, 400] },
  { category: 'TRANSPORT', frequencyPerMonth: 22, amountRange: [15, 80] },
  { category: 'BILLS', frequencyPerMonth: 2, amountRange: [80, 250] },
  { category: 'HEALTH', frequencyPerMonth: 1, amountRange: [60, 200] },
  { category: 'CLOTHING', frequencyPerMonth: 1, amountRange: [180, 600] },
  { category: 'EDUCATION', frequencyPerMonth: 1, amountRange: [80, 280] },
];

// Abonelikler — düzenli pattern (her ay sabit gün)
const SUBSCRIPTIONS = [
  { name: 'Netflix', amount: 199, day: 5 },
  { name: 'Spotify', amount: 84, day: 12 },
  { name: 'Disney Plus', amount: 89, day: 18 },
  { name: 'ChatGPT Plus', amount: 800, day: 25 },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

function startOf90DayWindow(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return addDays(today, -90);
}

// ─────────────────────────────────────────────────────────────
// Parametrik seed: bir user için tüm demo veriyi olusturur.
// Birden cok Auth user'a ayni demo'yu klonlamak icin export edildi.
// ─────────────────────────────────────────────────────────────
export interface SeedDemoInput {
  /** Auth user'in id'si (uuid). Bos birakilirsa Prisma cuid uretir. */
  id?: string;
  email: string;
  name: string;
  age?: number;
  monthlyIncome?: number;
}

export async function seedDemoForUser(input: SeedDemoInput) {
  // RNG state'i her user icin sifirla — deterministic data
  _rngState = 1337;

  // 1. Mevcutu temizle (idempotent)
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    console.log(`🧹 Mevcut "${input.email}" siliniyor (cascade)...`);
    await prisma.user.delete({ where: { id: existing.id } });
  }

  // 2. User
  const ayse = await prisma.user.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      email: input.email,
      name: input.name,
      age: input.age ?? 22,
      monthlyIncome: input.monthlyIncome ?? 8000,
      consentAcceptedAt: new Date(),
      consentVersion: '1.0',
    },
  });
  console.log(`✓ Kullanıcı: ${ayse.name} (id: ${ayse.id})`);

  // 3. Banka bağlantıları
  const garanti = await prisma.bankConnection.create({
    data: {
      userId: ayse.id,
      bankName: 'Garanti BBVA',
      connectedAt: startOf90DayWindow(),
    },
  });
  const isbank = await prisma.bankConnection.create({
    data: {
      userId: ayse.id,
      bankName: 'İş Bankası',
      connectedAt: startOf90DayWindow(),
    },
  });

  // 4. Hesaplar
  const garantiDebit = await prisma.account.create({
    data: {
      userId: ayse.id,
      bankConnId: garanti.id,
      type: 'DEBIT',
      last4: '4242',
      nickname: 'Vadesiz',
      balance: 4250,
    },
  });
  const isbankCC = await prisma.account.create({
    data: {
      userId: ayse.id,
      bankConnId: isbank.id,
      type: 'CREDIT_CARD',
      last4: '8810',
      nickname: 'Kart',
      balance: -1240,
    },
  });
  console.log(`✓ 2 banka, 2 hesap`);

  // 5. Transaction'lar — pattern bazlı 90 gün
  const startDate = startOf90DayWindow();
  const transactionsToCreate: Prisma.TransactionCreateManyInput[] = [];
  let txCount = 0;

  // Pattern-based regular transactions
  for (const pattern of SPENDING_PATTERNS) {
    const totalForWindow = Math.round((pattern.frequencyPerMonth * 90) / 30);
    for (let i = 0; i < totalForWindow; i++) {
      // Rastgele bir gün seç
      const dayOffset = rngInt(0, 89);
      const occurredAt = new Date(startDate);
      occurredAt.setDate(occurredAt.getDate() + dayOffset);
      occurredAt.setHours(rngInt(8, 22), rngInt(0, 59), 0, 0);

      const weekend = isWeekend(occurredAt);
      const boost = weekend && pattern.weekendBoost ? pattern.weekendBoost : 1;
      const baseAmount =
        rngFloat(pattern.amountRange[0], pattern.amountRange[1]) * boost * rngFloat(0.85, 1.15);
      const amount = Math.round(baseAmount * 100) / 100;

      const merchant = rngPick(TURKISH_MERCHANTS[pattern.category]);
      const useDebit = rng() > 0.4;

      let opportunity = 0;
      let isReducible = false;
      if (pattern.reducible && pattern.reducibleRate && rng() < pattern.reducibleRate) {
        isReducible = true;
        opportunity = Math.round(amount * rngFloat(0.3, 0.7));
      }

      transactionsToCreate.push({
        userId: ayse.id,
        accountId: useDebit ? garantiDebit.id : isbankCC.id,
        amount,
        merchant,
        occurredAt,
        category: pattern.category,
        isReducible,
        opportunity: opportunity > 0 ? opportunity : null,
        rawData: { source: 'mock-seed', pattern: pattern.category },
      });
      txCount++;
    }
  }

  // Abonelikler — her ay sabit gün (3 ay = 3 occurrence)
  for (const sub of SUBSCRIPTIONS) {
    for (let m = 0; m < 3; m++) {
      const occurredAt = new Date(startDate);
      occurredAt.setMonth(occurredAt.getMonth() + m);
      occurredAt.setDate(sub.day);
      occurredAt.setHours(3, 0, 0, 0); // gece otomatik
      if (occurredAt < new Date()) {
        transactionsToCreate.push({
          userId: ayse.id,
          accountId: isbankCC.id,
          amount: sub.amount,
          merchant: sub.name,
          description: 'Aylık abonelik',
          occurredAt,
          category: 'SUBSCRIPTIONS',
          isRecurring: true,
          isReducible: sub.name === 'Disney Plus' || sub.name === 'ChatGPT Plus',
          opportunity: sub.name === 'Disney Plus' ? 89 : sub.name === 'ChatGPT Plus' ? 800 : null,
          rawData: { source: 'mock-seed', subscription: true },
        });
        txCount++;
      }
    }
  }

  // Batch insert (Prisma createMany)
  await prisma.transaction.createMany({ data: transactionsToCreate });
  console.log(`✓ ${txCount} transaction (${SUBSCRIPTIONS.length} abonelik dahil)`);

  // 6. Subscription kayıtları (Subscription tablosu)
  for (const sub of SUBSCRIPTIONS) {
    await prisma.subscription.create({
      data: {
        userId: ayse.id,
        name: sub.name,
        amount: sub.amount,
        frequency: 'MONTHLY',
        status:
          sub.name === 'Disney Plus' || sub.name === 'ChatGPT Plus' ? 'CANCELLABLE' : 'ACTIVE',
        detectedAt: addDays(startDate, 7),
        lastChargedAt: new Date(),
        merchantPattern: sub.name,
      },
    });
  }
  console.log(`✓ ${SUBSCRIPTIONS.length} abonelik kaydı`);

  // 7. Rules
  await prisma.rule.createMany({
    data: [
      {
        userId: ayse.id,
        label: 'Haftalık mikro katkı',
        amount: 250,
        frequency: 'WEEKLY',
        active: true,
      },
      {
        userId: ayse.id,
        label: 'Maaş günü katkısı',
        amount: 1000,
        frequency: 'MONTHLY',
        active: true,
      },
    ],
  });
  console.log(`✓ 2 katki kurali`);

  // 8. Goals
  const targetDate2027 = new Date();
  targetDate2027.setFullYear(targetDate2027.getFullYear() + 1, 5, 1);

  const laptopGoal = await prisma.goal.create({
    data: {
      userId: ayse.id,
      name: 'Yeni MacBook',
      basePrice: 55000,
      currentPrice: 62500,
      inflationPct: 32,
      targetDate: targetDate2027,
      current: 8400,
      monthlyContribution: 1250,
      status: 'ACTIVE',
      priceHistory: [
        { date: '2026-02-01', price: 55000 },
        { date: '2026-03-01', price: 57000 },
        { date: '2026-04-01', price: 60000 },
        { date: '2026-05-01', price: 62500 },
      ],
      autoUpdate: true,
    },
  });

  await prisma.goalCheckpoint.createMany({
    data: [
      { goalId: laptopGoal.id, percent: 10, label: 'İlk %10' },
      { goalId: laptopGoal.id, percent: 25, label: 'Çeyrek yol' },
      { goalId: laptopGoal.id, percent: 50, label: 'Yarı yol' },
      { goalId: laptopGoal.id, percent: 75, label: 'Son düzlük' },
    ],
  });

  const targetDate2030 = new Date();
  targetDate2030.setFullYear(targetDate2030.getFullYear() + 4);
  const emergencyGoal = await prisma.goal.create({
    data: {
      userId: ayse.id,
      name: 'Acil durum fonu',
      basePrice: 30000,
      currentPrice: 30000,
      inflationPct: 28,
      targetDate: targetDate2030,
      current: 4500,
      monthlyContribution: 500,
      status: 'ACTIVE',
      autoUpdate: false,
    },
  });
  console.log(`✓ 2 hedef (MacBook + Acil fon)`);
  void emergencyGoal;

  // 9. Circle
  const familyCircle = await prisma.circle.create({
    data: {
      name: 'Aile birikimi',
      target: 50000,
      type: 'FAMILY',
      isPublic: false,
    },
  });
  await prisma.circleMembership.create({
    data: {
      circleId: familyCircle.id,
      userId: ayse.id,
      contribution: 3800,
      role: 'member',
    },
  });
  console.log(`✓ 1 circle (Aile birikimi)`);

  // 10. Future Score snapshots — son 4 hafta + bugün
  const baseScore = { contribution: 70, discipline: 60, consistency: 65, social: 50 };
  for (let weekAgo = 4; weekAgo >= 0; weekAgo--) {
    const snapshot = new Date();
    snapshot.setDate(snapshot.getDate() - weekAgo * 7);
    const drift = weekAgo * -2; // Daha eski = daha düşük (kullanıcı gelişiyor)
    await prisma.futureScoreSnapshot.create({
      data: {
        userId: ayse.id,
        contribution: baseScore.contribution + drift,
        discipline: baseScore.discipline + drift,
        consistency: baseScore.consistency + drift,
        social: baseScore.social,
        score: Math.round(
          (baseScore.contribution + drift) * 0.4 +
            (baseScore.discipline + drift) * 0.3 +
            (baseScore.consistency + drift) * 0.2 +
            baseScore.social * 0.1,
        ),
        computedAt: snapshot,
      },
    });
  }
  console.log(`✓ 5 Future Score snapshot (4 hafta + bugün)`);

  // 11. Birkaç notification
  await prisma.notification.createMany({
    data: [
      {
        userId: ayse.id,
        type: 'AI_INSIGHT',
        title: 'Kahve uyarısı',
        body: 'Bu ay kahve harcaman ortalamayı geçmek üzere.',
        read: false,
      },
      {
        userId: ayse.id,
        type: 'GOAL_MILESTONE',
        title: 'Hedefe yaklaşıyorsun',
        body: "MacBook hedefinin %15'ine ulaştın.",
        read: false,
      },
      {
        userId: ayse.id,
        type: 'RULE_TRIGGERED',
        title: 'Maaş günü',
        body: 'Yarın 1.000 ₺ otomatik katkı yapılacak.',
        read: true,
      },
    ],
  });
  console.log(`✓ 3 notification`);

  console.log('\n🎉 Seed tamamlandı!');
  console.log(`   User: ${ayse.email}`);
  console.log(`   ID: ${ayse.id}`);
  console.log(`   Transaction: ${txCount}`);
}

// CLI entry — `bun --filter @niyet/db seed` ile cagrildiginda Ayse default'una donulur.
async function main() {
  console.log('🌱 Seed başlıyor...');
  await seedDemoForUser({
    email: 'ayse@niyet.app',
    name: 'Ayşe Yılmaz',
    age: 22,
    monthlyIncome: 8000,
  });
}

// Sadece bu dosya DOGRUDAN calistirildiginda main()'i tetikle.
// Diger script'ler seedDemoForUser'i import ederken main() yan etkisi gormez.
const isDirectExecution = (import.meta as { main?: boolean }).main === true;
if (isDirectExecution) {
  main()
    .catch((e) => {
      console.error('❌ Seed başarısız:', e);
      process.exit(1);
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
