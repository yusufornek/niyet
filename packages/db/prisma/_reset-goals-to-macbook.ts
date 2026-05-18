/**
 * One-off script: tum kullanicilarin Goal kayitlarini sil; her kullaniciya
 * tek "Yeni MacBook" hedefi yarat. Demo akisi sadelestirme amacli (kullanici
 * istegi: herkes icin sadece MacBook hedefi gozuksun).
 *
 * Calistirma:
 *   cd packages/db && bunx dotenv -e ../../.env.local -- bun run _reset-goals-to-macbook.ts
 *
 * Demo sonrasi silinmeli (gitignore disindaki diger probe script'ler gibi).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Tum Goal kayitlari siliniyor...');
  const deleted = await prisma.goal.deleteMany({});
  console.log(`✓ ${deleted.count} goal silindi (cascade ile GoalCheckpoint, GoalPriceAlert vs).`);

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  console.log(`👥 ${users.length} kullanici bulundu, MacBook hedefi olusturuluyor...`);

  const targetDate = new Date('2027-12-31T00:00:00.000Z');

  for (const u of users) {
    const goal = await prisma.goal.create({
      data: {
        userId: u.id,
        name: 'Yeni MacBook',
        basePrice: 55000,
        currentPrice: 62500,
        inflationPct: 32,
        targetDate,
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
        { goalId: goal.id, percent: 10, label: 'İlk %10' },
        { goalId: goal.id, percent: 25, label: 'Çeyrek yol' },
        { goalId: goal.id, percent: 50, label: 'Yarı yol' },
        { goalId: goal.id, percent: 75, label: 'Üç çeyrek' },
      ],
    });

    console.log(`  ✓ ${u.name} (${u.id})`);
  }

  console.log('🎯 Tamam — her kullanici sadece MacBook hedefi gorur.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Hata:', e);
  await prisma.$disconnect();
  process.exit(1);
});
