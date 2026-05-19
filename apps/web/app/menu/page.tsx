'use client';

/**
 * /menu — uygulamadaki tüm sayfalara erişim için merkezi menü.
 *
 * Tab bar 4 sekmeye sadeleştirildi (Ana / Birikim / Asistan / Menü); detay
 * sayfaları artık buradan açılır. Bildirim için ayrıca Dashboard üst-sol Bell
 * ikonu mevcut.
 */
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Building2,
  CreditCard,
  History as HistoryIcon,
  ListChecks,
  Newspaper,
  Pause,
  PiggyBank,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { PhoneShell } from '@/components/phone-shell';

interface MenuItem {
  href: string;
  label: string;
  icon: ReactNode;
  desc: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const SECTIONS: MenuSection[] = [
  {
    title: 'Finans & Birikim',
    items: [
      {
        href: '/transactions',
        label: 'İşlemler',
        icon: <Wallet size={18} />,
        desc: 'Son 90 günün tüm işlemleri',
      },
      {
        href: '/contributions',
        label: 'Mikro Katkılarım',
        icon: <PiggyBank size={18} />,
        desc: 'Emekliliğine aktarılan tutarlar',
      },
      {
        href: '/subscriptions',
        label: 'Abonelikler',
        icon: <ListChecks size={18} />,
        desc: 'Düzenli giderler ve iptal adayları',
      },
      {
        href: '/rule',
        label: 'Otomatik Kurallar',
        icon: <Zap size={18} />,
        desc: 'Maaş günü / haftalık katkı kuralları',
      },
      {
        href: '/funds',
        label: 'Fon Önerileri',
        icon: <TrendingUp size={18} />,
        desc: 'Risk profiline uygun yatırım fonları',
      },
    ],
  },
  {
    title: 'Hedefler & Sosyal',
    items: [
      {
        href: '/goals',
        label: 'Hedeflerim',
        icon: <Target size={18} />,
        desc: 'Birikim hedeflerin + ilerleme',
      },
      {
        href: '/circles',
        label: 'Çemberler',
        icon: <Users size={18} />,
        desc: 'Aile / topluluk ortak birikim',
      },
    ],
  },
  {
    title: 'Analiz & İlerleme',
    items: [
      {
        href: '/score',
        label: 'Gelecek Skorum',
        icon: <Trophy size={18} />,
        desc: 'Finansal disiplin puanı',
      },
      {
        href: '/impact',
        label: 'Niyet Etkim',
        icon: <Sparkles size={18} />,
        desc: 'Toplam katkı + yıllık potansiyel',
      },
      {
        href: '/history',
        label: 'AI Analiz Geçmişi',
        icon: <HistoryIcon size={18} />,
        desc: 'Geçmiş analizler ve trendler',
      },
    ],
  },
  {
    title: 'Eğitim & Haber',
    items: [
      {
        href: '/learn',
        label: 'Öğren',
        icon: <BookOpen size={18} />,
        desc: 'Günlük finansal okuryazarlık',
      },
      {
        href: '/news',
        label: 'Finans Haberleri',
        icon: <Newspaper size={18} />,
        desc: 'Güncel piyasa ve ekonomi',
      },
    ],
  },
  {
    title: 'Hesap & Ayarlar',
    items: [
      {
        href: '/notifications',
        label: 'Bildirimler',
        icon: <Bell size={18} />,
        desc: 'Tüm bildirim geçmişi',
      },
      {
        href: '/connect',
        label: 'Banka & Kart',
        icon: <Building2 size={18} />,
        desc: 'Hesap bağlantıları',
      },
      {
        href: '/pause',
        label: 'Nefes Ayı',
        icon: <Pause size={18} />,
        desc: 'Katkıları geçici durdur',
      },
      {
        href: '/settings',
        label: 'Ayarlar',
        icon: <Settings size={18} />,
        desc: 'Profil, KVKK, çıkış',
      },
    ],
  },
  {
    title: 'Hızlı Erişim',
    items: [
      {
        href: '/category',
        label: 'Kategoriler',
        icon: <Activity size={18} />,
        desc: 'Harcama kategori dağılımı',
      },
      {
        href: '/demo-result',
        label: 'Demo Özeti',
        icon: <AlertCircle size={18} />,
        desc: 'Niyet tanıtım kartı',
      },
    ],
  },
];

export default function MenuPage() {
  const [query, setQuery] = useState('');

  // Substring filter (case + accent insensitive)
  const filteredSections = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (it) =>
          it.label.toLocaleLowerCase('tr-TR').includes(q) ||
          it.desc.toLocaleLowerCase('tr-TR').includes(q),
      ),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  const totalMatches = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <PhoneShell title="Menü">
      <p className="ny-tagline mb-3">Tüm sayfa ve özelliklere buradan ulaş.</p>

      {/* Arama barı — uiverse.io plastic-parrot stili */}
      <div className="mb-4">
        <input
          className="w-full rounded-full bg-zinc-200 px-4 py-2 font-mono text-zinc-700 shadow-md outline-none ring-1 ring-zinc-400 duration-300 placeholder:text-zinc-600 placeholder:opacity-50 focus:shadow-lg focus:shadow-rose-400/40 focus:ring-2 focus:ring-rose-400"
          autoComplete="off"
          placeholder="Menüde ara..."
          name="menu-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Menüde sayfa ara"
        />
        {query.trim() && (
          <div className="mt-2 px-1 text-xs opacity-60">
            {totalMatches > 0 ? `${totalMatches} sonuç` : 'Eşleşme yok'}
          </div>
        )}
      </div>

      {filteredSections.length === 0 ? (
        <div className="ny-card !p-6 text-center text-sm opacity-60">
          Aradığın sayfa bulunamadı. Farklı bir kelime dene.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredSections.map((section) => (
            <section key={section.title}>
              <div className="ny-eyebrow mb-2">{section.title}</div>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href as `/${string}`}
                    className="ny-card flex items-center gap-3 !p-3"
                    aria-label={`${item.label} sayfasını aç`}
                  >
                    <span className="text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--divider-soft))]">
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-tight">{item.label}</div>
                      <div className="mt-0.5 text-[11px] opacity-60">{item.desc}</div>
                    </div>
                    <span className="text-base opacity-30">›</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-[10px] opacity-40">
        Tab bardaki ✶ Ana / Birikim / Asistan ve <CreditCard size={10} className="inline" />{' '}
        bildirim ikonu hızlı erişim için kullanılır.
      </p>
    </PhoneShell>
  );
}
