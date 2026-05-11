'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { fmt, useApp } from '@/lib/stores/use-app';

export default function ChatbotPage() {
  const goals = useApp((s) => s.goals);
  const selectedGoalId = useApp((s) => s.selectedGoalId);
  const goal = goals.find((g) => g.id === selectedGoalId);
  const intro = goal
    ? `Merhaba 👋 "${goal.name}" hedefin için buradayım. Şu an ${fmt(goal.current)} biriktirdin, hedef ${fmt(goal.currentPrice ?? goal.target)}. Birlikte plan yapalım mı?`
    : 'Merhaba Ayşe 👋 Tasarruf hedeflerini birlikte çalışalım. En çok hangi kategoride zorlanıyorsun?';
  const [msgs, setMsgs] = useState<{ who: string; t: string }[]>([{ who: 'bot', t: intro }]);
  const [t, setT] = useState('');
  const send = (txt?: string) => {
    const msg = (txt ?? t).trim();
    if (!msg) return;
    setMsgs((m) => [...m, { who: 'me', t: msg }]);
    setT('');
    setTimeout(() => {
      const reply = goal
        ? `"${goal.name}" için aylık ${fmt(goal.monthlyContribution ?? 1000)} katkıyla mevcut tempoda ilerliyorsun. Katkıyı %20 artırırsak hedefe birkaç ay erken ulaşabilirsin. Karar tamamen sana ait — finansal tavsiye değildir.`
        : 'Bu kategoride aylık ortalamana göre küçük bir hedef belirleyebiliriz. Örneğin haftada 2 günü farklı planla; oluşan farkı mikro katkıya aktaralım. Karar tamamen sana ait — finansal tavsiye değildir.';
      setMsgs((m) => [...m, { who: 'bot', t: reply }]);
    }, 700);
  };
  const quick = goal
    ? ['Hedefe nasıl daha hızlı ulaşırım?', 'Aylık katkımı artır', 'Enflasyon etkisi nedir?']
    : ['Kahve', 'Dışarı yemek', 'Online alışveriş'];
  return (
    <PhoneShell title="Tasarruf Asistanı">
      <div className="space-y-3 pb-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.who === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.who === 'me'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'rounded-bl-md bg-[hsl(var(--canvas-parchment))]'
              }`}
            >
              {m.t}
            </div>
          </div>
        ))}
        {msgs.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quick.map((q) => (
              <button key={q} onClick={() => send(q)} className="ny-chip">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="absolute bottom-[64px] left-0 right-0 px-4">
        <div className="flex gap-2 rounded-full border border-[hsl(var(--hairline))] bg-white/95 p-1.5 backdrop-blur-xl">
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Bir soru yaz…"
            className="flex-1 bg-transparent px-3 text-sm outline-none"
          />
          <button
            onClick={() => send()}
            className="bg-primary flex h-10 w-10 items-center justify-center rounded-full text-white"
            aria-label="Gönder"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
