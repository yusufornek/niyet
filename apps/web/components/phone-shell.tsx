'use client';

import { Bell, ChevronLeft, Home, MessageCircle, PiggyBank } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  children: ReactNode;
  back?: boolean;
  dark?: boolean;
  scroll?: boolean;
  hideTabs?: boolean;
  rightSlot?: ReactNode;
};

/**
 * iPhone-style mobil ekran çerçevesi. Tarayıcıda mobil deneyimi simüle eder.
 * Mobile-first responsive: sm ve üstünde iPhone çerçevesi, altında full-bleed.
 */
export function PhoneShell({
  title,
  children,
  back,
  dark,
  scroll = true,
  hideTabs,
  rightSlot,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isLearnMode = pathname?.startsWith('/learn') ?? false;

  return (
    <div className="flex h-[100dvh] items-stretch justify-center bg-[hsl(var(--canvas-parchment))] sm:h-auto sm:min-h-screen sm:items-start sm:py-8">
      <div
        className={cn(
          'relative flex h-full w-full flex-col overflow-hidden sm:h-[844px] sm:w-[390px] sm:rounded-[44px] sm:border sm:border-black/10',
          dark
            ? 'bg-[hsl(var(--tile-1))] text-[hsl(var(--body-on-dark))]'
            : 'text-foreground bg-[hsl(var(--canvas))]',
        )}
        style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.25)' }}
      >
        {/* Status bar */}
        <div
          className={cn(
            'flex items-center justify-between px-6 pb-1 pt-3 text-[12px]',
            dark ? 'text-white/80' : 'text-foreground/70',
          )}
        >
          <span>9:41</span>
          <span className="font-semibold tracking-tight">Niyet</span>
          <span>●●●●</span>
        </div>

        {/* Header */}
        {(title || back) && (
          <div className="flex items-center gap-2 px-5 pb-3 pt-2">
            {back && (
              <button
                onClick={() => router.back()}
                className={cn(
                  '-ml-2 rounded-full p-1',
                  dark ? 'hover:bg-white/10' : 'hover:bg-black/5',
                )}
                aria-label="Geri"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {title && <h1 className="ny-h2 flex-1 truncate">{title}</h1>}
            {rightSlot}
          </div>
        )}

        <div className={cn('flex-1 px-5 pb-28', scroll ? 'overflow-y-auto' : 'overflow-hidden')}>
          {children}
        </div>

        {/* Bottom tab bar */}
        {!hideTabs && (
          <nav
            className={cn(
              'absolute bottom-0 left-0 right-0 flex items-center justify-around px-4 py-3',
              isLearnMode
                ? 'border-t-2 border-[#E5E5E5] bg-[#F7F7F7]'
                : dark
                  ? 'border-t border-white/10 bg-black/40 backdrop-blur-xl'
                  : 'border-t border-[hsl(var(--hairline))] bg-white/80 backdrop-blur-xl',
            )}
          >
            <TabBtn
              icon={<Home size={20} />}
              label="Ana"
              href="/dashboard"
              active={pathname === '/dashboard'}
              duo={isLearnMode}
            />
            <TabBtn
              icon={<PiggyBank size={20} />}
              label="Birikim"
              href="/savings"
              active={
                pathname === '/savings' ||
                pathname === '/radar' ||
                (pathname?.startsWith('/goals') ?? false)
              }
              duo={isLearnMode}
            />
            <TabBtn
              icon={<MessageCircle size={20} />}
              label="Asistan"
              href="/chatbot"
              active={pathname === '/chatbot'}
              duo={isLearnMode}
            />
            <TabBtn
              icon={<Bell size={20} />}
              label="Bildirim"
              href="/notifications"
              active={pathname === '/notifications'}
              duo={isLearnMode}
            />
          </nav>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  icon,
  label,
  href,
  active,
  duo,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  active: boolean;
  duo?: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 px-2">
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl',
          duo
            ? active
              ? 'bg-[#DFF7CC] text-[#58CC02]'
              : 'text-[#A0A0A0]'
            : active
              ? 'text-primary'
              : 'opacity-60',
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          'text-[10px]',
          duo
            ? active
              ? 'font-extrabold text-[#58CC02]'
              : 'font-bold text-[#9A9A9A]'
            : active
              ? 'text-primary font-semibold'
              : 'opacity-60',
        )}
      >
        {label}
      </span>
    </Link>
  );
}
