import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = readFileSync(resolve(process.cwd(), '.env.vercel.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let val = m[2];
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  if (!process.env[m[1]]) process.env[m[1]] = val;
}

const { createClient } = await import('@supabase/supabase-js');
const { prisma } = await import('@niyet/db');

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await supa.auth.admin.listUsers();
if (error) {
  console.error(error);
  process.exit(1);
}

console.log('Auth users (' + data.users.length + '):');
for (const u of data.users) {
  console.log('  -', u.email, '|', u.id, '| created:', u.created_at);
}

const publicUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
console.log('\npublic.User (' + publicUsers.length + '):');
for (const u of publicUsers) {
  console.log('  -', u.email, '|', u.id, '| name:', u.name);
}

await prisma.$disconnect();
