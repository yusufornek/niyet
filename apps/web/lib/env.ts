// Env var schema validation — boot time'da geçersiz config'i yakala.
// Server-side ve client-side env'ler ayrı validate edilir.
import { z } from 'zod';

const ServerEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1).optional(), // Faz 5'te zorunlu
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
});

const isServer = typeof window === 'undefined';

function parseEnv() {
  if (isServer) {
    const parsed = z
      .object({ ...ServerEnvSchema.shape, ...ClientEnvSchema.shape })
      .safeParse(process.env);

    if (!parsed.success) {
      // Boot time hata: env eksik veya yanlış format
      console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
      throw new Error("Geçersiz environment variables. Detay için console.error log'una bak.");
    }
    return parsed.data;
  }

  // Client-side: yalnızca NEXT_PUBLIC_* erişilebilir
  const parsed = ClientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  });

  if (!parsed.success) {
    console.error('❌ Invalid client env vars:', parsed.error.flatten().fieldErrors);
    throw new Error('Geçersiz client environment variables.');
  }
  return parsed.data;
}

export const env = parseEnv();
