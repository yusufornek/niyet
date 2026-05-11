import type { Metadata, Viewport } from 'next';

import { Providers } from '@/components/providers';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Niyet — AI Destekli Mikro Emeklilik',
    template: '%s · Niyet',
  },
  description:
    'Harcamadığını geleceğine aktar. AI destekli mikro emeklilik ve birikim alışkanlığı platformu.',
  applicationName: 'Niyet',
  authors: [{ name: 'Niyet Ekibi' }],
  keywords: ['emeklilik', 'birikim', 'mikro tasarruf', 'fintech', 'AI', 'Niyet'],
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0066cc',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
