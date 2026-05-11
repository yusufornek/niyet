'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { PhoneShell } from '@/components/phone-shell';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !name) {
      toast.error('Tüm alanlar gerekli');
      return;
    }
    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      toast.error('Kayıt başarısız', { description: error.message });
      return;
    }
    toast.success('Hesap oluşturuldu', {
      description: "Email'ini doğrulamak için kutuna gelen linke tıkla.",
    });
    router.push('/login');
  }

  return (
    <PhoneShell title="Kayıt ol" hideTabs back>
      <div className="space-y-4 pt-4">
        <div>
          <label className="ny-eyebrow mb-1 block">İsim</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ayşe Yılmaz"
            autoComplete="name"
            className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          />
        </div>
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
            placeholder="En az 6 karakter"
            autoComplete="new-password"
            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
            className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          />
        </div>
        <button
          onClick={handleSignup}
          disabled={loading}
          className="ny-pill w-full disabled:opacity-50"
        >
          {loading ? 'Kayıt oluyor…' : 'Hesap oluştur'}
        </button>

        <p className="pt-2 text-center text-sm">
          Hesabın var mı?{' '}
          <button onClick={() => router.push('/login')} className="text-primary font-semibold">
            Giriş yap
          </button>
        </p>

        <p className="pt-3 text-center text-xs opacity-60">
          Devam ederek <span className="underline">Kullanım Koşulları</span> ve{' '}
          <span className="underline">Gizlilik Politikası</span>&apos;nı kabul edersin.
        </p>
      </div>
    </PhoneShell>
  );
}
