/**
 * Logout endpoint — Supabase session'ı sonlandırır, login'e yönlendirir.
 */
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/login`, { status: 303 });
}

export async function GET() {
  return POST();
}
