import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="ny-eyebrow">Niyet</span>
        <h1 className="ny-h1 max-w-[420px]">
          Harcamadığını <span className="text-primary">geleceğine</span> aktar.
        </h1>
        <p className="ny-tagline max-w-[480px]">
          AI destekli mikro emeklilik ve birikim asistanın. Banka hareketlerini izinli analiz eder,
          azaltılabilir harcamaları emeklilik katkısına dönüştürür.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/onboarding" className="ny-pill">
          Başla
        </Link>
        <Link href="/dashboard" className="ny-pill-ghost">
          Demo modunda dene
        </Link>
      </div>

      <p className="text-xs text-[hsl(var(--ink-muted-48))]">Yatırım tavsiyesi içermez.</p>
    </main>
  );
}
