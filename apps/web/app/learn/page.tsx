'use client';

import { BookOpen, Flame, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { useCompleteLearnCard, useLearnHome } from '@/lib/graphql/queries';

export default function LearnPage() {
  const { data, isLoading } = useLearnHome();
  const completeLearnCard = useCompleteLearnCard();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const learnHome = data?.learnHome;
  const activeCard = useMemo(
    () => learnHome?.cards.find((card) => card.id === openCardId) ?? null,
    [learnHome?.cards, openCardId],
  );

  const submitQuiz = async () => {
    if (!activeCard) return;
    const selectedAnswers = activeCard.quizItems.map((item) => answers[item.id] ?? -1);
    await completeLearnCard.mutateAsync({
      cardId: activeCard.id,
      quizAnswers: selectedAnswers,
    });
    setOpenCardId(null);
    setAnswers({});
  };

  return (
    <PhoneShell title="Öğren" back>
      {isLoading ? (
        <div className="space-y-3">
          <div className="ny-card h-28 animate-pulse" />
          <div className="ny-card h-40 animate-pulse" />
        </div>
      ) : !learnHome ? (
        <p className="ny-tagline">Günlük içerik hazırlanıyor. Lütfen biraz sonra tekrar dene.</p>
      ) : (
        <>
          <p className="ny-tagline mb-4">{learnHome.summary}</p>

          <div className="ny-card mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Günlük ilerleme</div>
              <div className="text-xs opacity-60">
                {new Date(learnHome.packDate).toLocaleDateString('tr-TR')}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-[hsl(var(--hairline))] p-2">
                <div className="text-xs opacity-60">XP</div>
                <div className="text-sm font-semibold">{learnHome.state.totalXp}</div>
              </div>
              <div className="rounded-xl border border-[hsl(var(--hairline))] p-2">
                <div className="text-xs opacity-60">Seviye</div>
                <div className="text-sm font-semibold">{learnHome.state.level}</div>
              </div>
              <div className="rounded-xl border border-[hsl(var(--hairline))] p-2">
                <div className="text-xs opacity-60">Streak</div>
                <div className="flex items-center justify-center gap-1 text-sm font-semibold">
                  <Flame size={13} className="text-amber-500" />
                  {learnHome.state.streakDays}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {learnHome.cards.map((card) => (
              <button
                key={card.id}
                onClick={() => setOpenCardId(card.id)}
                className="ny-card flex w-full items-start gap-3 text-left"
              >
                <BookOpen size={20} className="text-primary mt-1 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{card.title}</div>
                    {card.completed && (
                      <span className="text-primary rounded-full border border-current px-2 py-0.5 text-[11px] font-semibold">
                        Tamamlandı
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm opacity-70">{card.shortDescription}</div>
                  <div className="mt-2 text-xs opacity-60">
                    Kaynak: {card.sourceName}{' '}
                    {card.sourceUpdatedAt
                      ? `• ${new Date(card.sourceUpdatedAt).toLocaleDateString('tr-TR')}`
                      : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="ny-card mt-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Trophy size={14} /> Çember liderlik tablosu
            </div>
            {learnHome.leaderboard.length === 0 ? (
              <p className="text-xs opacity-60">Sıralama için bir çembere katıl.</p>
            ) : (
              <div className="space-y-2">
                {learnHome.leaderboard.map((row, i) => (
                  <div key={row.userId} className="flex items-center justify-between text-sm">
                    <span>
                      {i + 1}. {row.userName}
                    </span>
                    <span className="font-semibold">{row.totalXp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeCard && (
            <div className="ny-card mt-4">
              <div className="text-sm font-semibold">{activeCard.title}</div>
              <p className="mt-2 text-sm opacity-80">{activeCard.body}</p>
              <a
                href={activeCard.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary mt-2 block text-xs underline"
              >
                Resmi kaynağı aç
              </a>
              <div className="mt-4 space-y-4">
                {activeCard.quizItems.map((q, qi) => (
                  <div key={q.id}>
                    <div className="text-sm font-semibold">
                      {qi + 1}. {q.question}
                    </div>
                    <div className="mt-2 space-y-2">
                      {q.options.map((opt, oi) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                          className={`w-full rounded-xl border p-2 text-left text-xs ${
                            answers[q.id] === oi
                              ? 'border-primary bg-primary/5'
                              : 'border-[hsl(var(--hairline))]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={submitQuiz}
                  disabled={completeLearnCard.isPending}
                  className="ny-pill flex-1 disabled:opacity-50"
                >
                  {completeLearnCard.isPending ? 'Kaydediliyor...' : 'Dersi tamamla'}
                </button>
                <button
                  onClick={() => setOpenCardId(null)}
                  className="ny-pill-ghost flex-1"
                  disabled={completeLearnCard.isPending}
                >
                  Kapat
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PhoneShell>
  );
}
