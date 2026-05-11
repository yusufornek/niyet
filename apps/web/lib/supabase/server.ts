// Server-side Supabase client (Server Components, Route Handlers, Server Actions için).
// Cookie tabanlı auth session yönetimi.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component'lerden cookie set edilirse hata fırlatılır;
          // middleware her şekilde session'ı tazeleyeceği için bu güvenli bir no-op.
        }
      },
    },
  });
}
