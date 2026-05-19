'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, Flame, Sparkles } from 'lucide-react';

import { PhoneShell } from '@/components/phone-shell';
import { Spinner } from '@/components/spinner';
import { useCompleteLearnCard, useLearnCard } from '@/lib/graphql/queries';

export default function LearnCardPage() {
  const params = useParams<{ id: string }>();
  const cardId = String(params?.id ?? '');
  const { data, isLoading } = useLearnCard(cardId);
  const completeLearnCard = useCompleteLearnCard();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const card = data?.learnCard;
  const selectedCount = card ? Object.keys(answers).length : 0;
  const totalCount = card?.quizItems.length ?? 0;

  const submitQuiz = async () => {
    if (!card) return;
    const selectedAnswers = card.quizItems.map((item) => answers[item.id] ?? -1);
    await completeLearnCard.mutateAsync({
      cardId: card.id,
      quizAnswers: selectedAnswers,
    });
  };

  return (
    <PhoneShell title="Kart Detayı" back>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Yükleniyor" />
        </div>
      ) : !card ? (
        <div className="ny-card space-y-2 text-sm">
          <p>Bu kart bulunamadı veya artık yayında değil.</p>
          <Link href="/learn" className="text-primary text-xs underline">
            Öğren ekranına dön
          </Link>
        </div>
      ) : (
        <div className="space-y-3 font-['Nunito',-apple-system,BlinkMacSystemFont,sans-serif]">
          <div className="rounded-[20px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_2px_0_#E5E5E5]">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFC800] px-2 py-0.5 text-[11px] font-extrabold text-white">
                <Sparkles size={12} />
                Ders
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF9600] px-2 py-0.5 text-[11px] font-extrabold text-white">
                <Flame size={12} />
                Quiz
              </span>
            </div>
            <div className="text-[24px] font-extrabold leading-tight text-[#3C3C3C]">
              {card.title}
            </div>
            <p className="mt-3 whitespace-pre-line text-sm font-bold text-[#4F4F4F]">{card.body}</p>
            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs font-extrabold text-[#1CB0F6] underline"
            >
              Resmi kaynağı aç
            </a>
          </div>

          <div className="rounded-[20px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_2px_0_#E5E5E5]">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-extrabold text-[#3C3C3C]">Mini Quiz</div>
              <div className="text-xs font-extrabold text-[#777777]">
                {selectedCount}/{totalCount} seçildi
              </div>
            </div>
            <div className="mb-3 h-3 w-full rounded-full border-2 border-[#E5E5E5] bg-[#EBEBEB] p-[2px]">
              <div
                className="h-full rounded-full bg-[#58CC02] transition-all"
                style={{ width: `${Math.round((selectedCount / Math.max(totalCount, 1)) * 100)}%` }}
              />
            </div>
            <div className="mt-3 space-y-4">
              {card.quizItems.map((q, qi) => (
                <div key={q.id}>
                  <div className="text-sm font-extrabold text-[#3C3C3C]">
                    {qi + 1}. {q.question}
                  </div>
                  <div className="mt-2 space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={opt}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                        className={`w-full rounded-[12px] border-2 p-3 text-left text-xs font-extrabold transition ${
                          answers[q.id] === oi
                            ? 'border-[#58CC02] bg-[#F3FFE8] text-[#3C3C3C] shadow-[0_2px_0_#58A700]'
                            : 'border-[#E5E5E5] bg-white text-[#4F4F4F] shadow-[0_2px_0_#E5E5E5]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={submitQuiz}
              disabled={completeLearnCard.isPending || selectedCount !== totalCount}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#58A700] bg-[#58CC02] px-4 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_#58A700] transition active:translate-y-[2px] active:shadow-[0_2px_0_#58A700] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {completeLearnCard.isPending ? 'Kaydediliyor...' : 'Dersi tamamla'}
            </button>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}
