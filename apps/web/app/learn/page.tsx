'use client';

import { Flame, Gem, Check, BookOpen, ChevronUp } from 'lucide-react';
import Link from 'next/link';

import { PhoneShell } from '@/components/phone-shell';
import { useLearnHome } from '@/lib/graphql/queries';

export default function LearnPage() {
  const { data, isLoading } = useLearnHome();
  const learnHome = data?.learnHome;

  return (
    <PhoneShell title="Öğren" back>
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded-xl bg-[#ECECEC]" />
          <div className="h-16 animate-pulse rounded-2xl bg-[#ECECEC]" />
          <div className="h-[460px] animate-pulse rounded-2xl bg-[#ECECEC]" />
        </div>
      ) : !learnHome ? (
        <p className="ny-tagline">Günlük içerik hazırlanıyor. Lütfen biraz sonra tekrar dene.</p>
      ) : (
        <div className="space-y-3 font-['Nunito',-apple-system,BlinkMacSystemFont,sans-serif]">
          <div className="flex items-center justify-between rounded-2xl border-2 border-[hsl(var(--hairline))] bg-[hsl(var(--canvas))] px-3 py-2 shadow-[0_2px_0_hsl(var(--hairline))]">
            <div className="flex items-center gap-2 text-[hsl(var(--warning-500))]">
              <Flame size={16} />
              <span className="text-sm font-extrabold">{learnHome.state.streakDays}</span>
            </div>
            <div className="text-primary flex items-center gap-2">
              <Gem size={16} />
              <span className="text-sm font-extrabold">{learnHome.state.totalXp}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border-2 border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-2 py-1 text-[hsl(var(--ink))] shadow-[0_2px_0_hsl(var(--hairline))]">
              <span className="text-[10px] font-extrabold">Lv {learnHome.state.level}</span>
              <span className="text-[10px] font-bold text-[hsl(var(--ink-muted-80))]">
                {new Date(learnHome.packDate).toLocaleDateString('tr-TR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className="border-primary bg-primary rounded-2xl border-2 p-3 text-[hsl(var(--primary-foreground))] shadow-[0_4px_0_hsl(var(--primary-focus))]">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-[hsl(var(--primary-foreground))/0.85]">
              Bölüm 2, Ünite 17
            </p>
            <h2 className="text-[24px] font-extrabold leading-tight">{learnHome.summary}</h2>
          </div>

          <div className="relative min-h-[560px] rounded-2xl border-2 border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-4">
            <div className="absolute left-1/2 top-4 h-[520px] w-[2px] -translate-x-1/2 rounded-full bg-[hsl(var(--hairline))]" />

            {learnHome.cards.map((card, idx) => {
              const side = idx % 2 === 0 ? 'left' : 'right';
              const top = 20 + idx * 120;
              const isCurrent =
                !card.completed && idx === learnHome.cards.findIndex((c) => !c.completed);
              const xOffset = side === 'left' ? 'calc(50% - 72px)' : 'calc(50% + 12px)';

              return (
                <div key={card.id} className="absolute" style={{ top: `${top}px`, left: xOffset }}>
                  <Link
                    href={`/learn/${card.id}`}
                    className={`duo-node flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 text-white transition active:translate-y-[2px] ${
                      card.completed
                        ? 'border-primary bg-primary shadow-[0_4px_0_hsl(var(--primary-focus))]'
                        : isCurrent
                          ? 'border-primary bg-primary shadow-[0_4px_0_hsl(var(--primary-focus))]'
                          : 'border-[hsl(var(--hairline-strong))] bg-[hsl(var(--tile-2))] shadow-[0_4px_0_hsl(var(--hairline-strong))]'
                    }`}
                    aria-label={`${card.title} dersine git`}
                  >
                    {card.completed ? (
                      <Check size={24} strokeWidth={3} />
                    ) : (
                      <BookOpen size={22} strokeWidth={2.4} />
                    )}
                  </Link>

                  {isCurrent ? (
                    <div className="border-primary/30 bg-primary/10 text-primary absolute -right-8 -top-2 rounded-full border px-2 py-1 text-[10px] font-extrabold">
                      Şimdi
                    </div>
                  ) : null}
                </div>
              );
            })}

            <button
              type="button"
              className="text-primary absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[hsl(var(--hairline))] bg-[hsl(var(--canvas))] shadow-[0_2px_0_hsl(var(--hairline))]"
            >
              <ChevronUp size={18} />
            </button>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}
