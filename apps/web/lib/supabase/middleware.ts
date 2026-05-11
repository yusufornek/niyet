// Supabase middleware helper: her request'te auth session'ı tazeler.
// `middleware.ts` (root) bunu çağırır.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // ÖNEMLİ: getUser() session'ı server-side doğrular ve cookie'yi taze tutar.
  // getSession() yerine bunu kullan; getSession() sadece cookie'yi okur, doğrulamaz.
  await supabase.auth.getUser();

  return response;
}
