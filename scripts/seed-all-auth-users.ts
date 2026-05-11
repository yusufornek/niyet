/**
 * Tum Supabase Auth user'larina Ayse-tarzi demo veri klonlar.
 *
 * Calistirma:
 *   set -a && source .env.vercel.local && set +a
 *   bun scripts/seed-all-auth-users.ts
 *
 * Her Auth user icin:
 *   - public.User satiri (id = Auth user.id) olusturulur (varsa cascade silinip yeniden)
 *   - 222 transaction, 4 abonelik, 2 hedef, 5 future score snapshot, 3 notification
 *
 * Demo email'i (ayse@niyet.app) Auth'ta yoksa atlanir.
 */
import { createClient } from '@supabase/supabase-js';

import { seedDemoForUser } from '../packages/db/prisma/seed';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Eksik env: NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supa.auth.admin.listUsers();
if (error || !data) {
  console.error('listUsers hatasi:', error);
  process.exit(1);
}

console.log(`Auth user sayisi: ${data.users.length}`);

let success = 0;
let skipped = 0;
let failed = 0;

for (const u of data.users) {
  if (!u.email) {
    console.log(`⚠️  ${u.id} — email yok, atlandi`);
    skipped++;
    continue;
  }
  try {
    // name: user_metadata.name varsa onu kullan, yoksa email'in @ oncesi
    const metaName = (u.user_metadata as { name?: string } | null | undefined)?.name;
    const fallbackName = u.email.split('@')[0]!;
    const name = (metaName ?? fallbackName).slice(0, 50);

    console.log(`\n── ${u.email} (${u.id}) → ${name}`);
    await seedDemoForUser({
      id: u.id,
      email: u.email,
      name,
      age: 22,
      monthlyIncome: 8000,
    });
    success++;
  } catch (err) {
    console.error(`❌ ${u.email} icin seed basarisiz:`, err);
    failed++;
  }
}

console.log(`\n🎉 Tamamlandi — basarili: ${success}, atlandi: ${skipped}, hata: ${failed}`);
process.exit(0);
