'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { PhoneShell } from '@/components/phone-shell';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      toast.error('Email ve şifre gerekli');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error('Giriş başarısız', { description: error.message });
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  async function handleDemoMode() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (error) {
      toast.error('Demo modu başlatılamadı', { description: error.message });
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <PhoneShell title="Giriş" hideTabs back>
      <div className="space-y-4 pt-4">
        <div>
          <label className="ny-eyebrow mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@niyet.app"
            autoComplete="email"
            className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          />
        </div>
        <div>
          <label className="ny-eyebrow mb-1 block">Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          />
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="ny-pill w-full disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>

        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-[hsl(var(--hairline))]" />
          <span className="text-xs opacity-50">veya</span>
          <div className="h-px flex-1 bg-[hsl(var(--hairline))]" />
        </div>

        <button
          onClick={handleDemoMode}
          disabled={loading}
          className="ny-pill-ghost w-full disabled:opacity-50"
        >
          Demo modunda dene
        </button>

        <p className="pt-2 text-center text-sm">
          Hesabın yok mu?{' '}
          <button onClick={() => router.push('/signup')} className="text-primary font-semibold">
            Kayıt ol
          </button>
        </p>
      </div>
    </PhoneShell>
  );
}
