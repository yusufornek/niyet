'use client';

import { ArrowRight, Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import {
  useChatSession,
  useChatSessions,
  useDeleteChatSession,
  useGoals,
  useSendChatMessage,
  type CoachRecommendation,
} from '@/lib/graphql/queries';

const SUGGESTED_PROMPTS = [
  'Bu ay nasıl gidiyorum?',
  'Kahveden nasıl tasarruf edebilirim?',
  'Aboneliklerimden hangisini iptal etmeliyim?',
  'Hedefe nasıl daha hızlı ulaşırım?',
];

export default function ChatbotClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalIdParam = searchParams.get('goalId');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [lastRecommendation, setLastRecommendation] = useState<CoachRecommendation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessionsData } = useChatSessions(10);
  const { data: sessionData } = useChatSession(sessionId);
  const sendMessage = useSendChatMessage();
  const deleteSession = useDeleteChatSession();
  const { data: goalsData } = useGoals();

  const session = sessionData?.chatSession;
  const messages = session?.messages?.filter((m) => m.role !== 'TOOL') ?? [];

  const goalContext = goalIdParam ? goalsData?.goals.find((g) => g.id === goalIdParam)?.name : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streaming]);

  async function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || streaming) return;
    setInput('');
    setStreaming(true);
    setLastRecommendation(null);
    try {
      const result = await sendMessage.mutateAsync({
        message,
        sessionId: sessionId ?? undefined,
        goalContext: goalContext ?? undefined,
        goalId: goalIdParam ?? undefined,
      });
      setSessionId(result.sendChatMessage.sessionId);
      setLastRecommendation(result.sendChatMessage.recommendation);
    } finally {
      setStreaming(false);
    }
  }

  function handleRecommendationClick(rec: CoachRecommendation) {
    setLastRecommendation(null);
    switch (rec.actionType) {
      case 'ACCEPT_CATEGORY':
        router.push(rec.targetRef ? `/category/${rec.targetRef}` : '/radar');
        break;
      case 'CANCEL_SUBSCRIPTION':
        router.push('/subscriptions');
        break;
      case 'CREATE_RULE':
        router.push('/rule');
        break;
      case 'OPEN_GOAL':
        router.push(rec.targetRef ? `/goals/${rec.targetRef}` : '/goals');
        break;
    }
  }

  return (
    <PhoneShell
      title="Tasarruf Asistanı"
      rightSlot={
        sessionId && (
          <button
            onClick={() => {
              if (confirm('Bu sohbeti silmek istediğinden emin misin?')) {
                deleteSession.mutate(sessionId);
                setSessionId(null);
                setLastRecommendation(null);
              }
            }}
            className="p-1 opacity-60 hover:opacity-100"
            aria-label="Sohbeti sil"
          >
            <Trash2 size={18} />
          </button>
        )
      }
    >
      {goalContext && (
        <div className="ny-card border-primary/30 bg-primary/5 mb-3 text-sm">
          <span className="font-semibold">{goalContext}</span> hedefi için sohbet ediyorsun.
        </div>
      )}

      {!sessionId && (sessionsData?.chatSessions ?? []).length > 0 && (
        <div className="mb-4">
          <div className="ny-eyebrow mb-2">Önceki sohbetler</div>
          <div className="space-y-2">
            {sessionsData!.chatSessions.slice(0, 3).map((s) => (
              <button
                key={s.id}
                onClick={() => setSessionId(s.id)}
                className="ny-card w-full text-left text-sm"
              >
                <div className="font-semibold">{s.title ?? 'Sohbet'}</div>
                <div className="text-xs opacity-60">
                  {new Date(s.updatedAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {s.totalTokens > 0 && ` · ${s.totalTokens} token`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 pb-4">
        {messages.length === 0 && !streaming && (
          <div className="ny-card border-primary/30 bg-primary/5">
            <div className="flex items-start gap-2">
              <Sparkles size={18} className="text-primary mt-0.5" />
              <div className="text-sm">
                Merhaba! Niyet&apos;in AI Tasarruf Koçu&apos;yum. Harcama analizlerin, aboneliklerin
                ve hedeflerin hakkında her şeyi sorabilirsin.
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === 'USER'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'rounded-bl-md bg-[hsl(var(--canvas-parchment))]'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.tokensUsed != null && m.tokensUsed > 0 && (
                <div className="mt-1 text-[10px] opacity-50">{m.tokensUsed} token</div>
              )}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-[hsl(var(--canvas-parchment))] px-4 py-3 text-sm">
              <Loader2 size={14} className="text-primary animate-spin" />
              <span className="text-xs opacity-60">Düşünüyorum…</span>
            </div>
          </div>
        )}

        {lastRecommendation && !streaming && (
          <button
            onClick={() => handleRecommendationClick(lastRecommendation)}
            className="ny-card border-primary/40 bg-primary/5 hover:border-primary w-full text-left transition"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-full">
                <Sparkles size={16} className="text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-primary text-sm font-semibold">{lastRecommendation.label}</div>
                <div className="mt-0.5 text-xs opacity-70">{lastRecommendation.reasoning}</div>
              </div>
              <ArrowRight size={16} className="text-primary" />
            </div>
          </button>
        )}

        {messages.length === 0 && !streaming && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <button key={p} onClick={() => handleSend(p)} className="ny-chip text-xs">
                {p}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-[64px] left-0 right-0 px-4">
        <div className="flex gap-2 rounded-full border border-[hsl(var(--hairline))] bg-white/95 p-1.5 backdrop-blur-xl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={streaming ? 'Cevap geliyor…' : 'Bir soru sor…'}
            disabled={streaming}
            className="flex-1 bg-transparent px-3 text-sm outline-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={streaming || !input.trim()}
            className="bg-primary flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-50"
            aria-label="Gönder"
          >
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
