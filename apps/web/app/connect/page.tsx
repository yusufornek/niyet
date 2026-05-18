'use client';

/**
 * /connect — banka/kart hesabi baglama sayfasi.
 *
 * PBI: "Banka veya kredi karti hesabimi uygulamaya baglayabilmek istiyorum;
 * boylece harcama verilerim analiz edilerek azaltilabilir harcamalarim
 * tespit edilebilsin."
 *
 * NOT: Niyet henuz Open Banking lisansli degil — bu sayfa gercek banka API'sine
 * baglanmaz, MockBankConnectionAdapter ile DB'ye gercek BankConnection + Account
 * + son 30 gun mock islem yazar. Lisans alindiginda backend adapter degisecek,
 * UI degismez.
 */
import { AlertTriangle, ArrowRight, Check, CreditCard, Sparkles, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { WalletReveal } from '@/components/wallet-reveal';
import {
  SUPPORTED_BANK_CATEGORY,
  SUPPORTED_BANK_CATEGORY_LABEL,
  SUPPORTED_BANK_LABELS,
  useConnectBank,
  useDisconnectBank,
  useMyBankConnections,
  useSupportedBanks,
  type AccountType,
  type SupportedBank,
  type SupportedBankCategory,
} from '@/lib/graphql/queries';
import { useApp } from '@/lib/stores/use-app';
import { formatTRY } from '@/lib/utils';

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CREDIT_CARD: 'Kredi Kartı',
  DEBIT: 'Vadesiz',
  CHECKING: 'Çek Hesabı',
  SAVINGS: 'Birikim',
};

export default function ConnectPage() {
  const router = useRouter();
  const setConnected = useApp((s) => s.setConnected);

  const { data: supportedBanks, isLoading: banksLoading } = useSupportedBanks();
  const { data: myConnections, isLoading: connsLoading } = useMyBankConnections();
  const connectBank = useConnectBank();
  const disconnectBank = useDisconnectBank();

  const [pendingBank, setPendingBank] = useState<SupportedBank | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('DEBIT');

  // BankConnection.bankName DB'de "Akbank" gibi tam ad olarak duruyor —
  // SUPPORTED_BANK_LABELS reverse lookup ile identifier kümesine cevir.
  const connectedBankIds = new Set<SupportedBank>();
  for (const conn of myConnections ?? []) {
    for (const [id, label] of Object.entries(SUPPORTED_BANK_LABELS)) {
      if (label === conn.bankName) {
        connectedBankIds.add(id as SupportedBank);
      }
    }
  }

  // Kategorilere ayir (UI gruplandirma)
  const banksByCategory: Record<SupportedBankCategory, SupportedBank[]> = {
    PUBLIC: [],
    PRIVATE: [],
    FOREIGN: [],
    PARTICIPATION: [],
    DIGITAL: [],
  };
  for (const b of supportedBanks ?? []) {
    banksByCategory[SUPPORTED_BANK_CATEGORY[b]].push(b);
  }
  const categoryOrder: SupportedBankCategory[] = [
    'PUBLIC',
    'PRIVATE',
    'PARTICIPATION',
    'DIGITAL',
    'FOREIGN',
  ];

  const handleConnect = (bankName: SupportedBank) => {
    setPendingBank(bankName);
    connectBank.mutate(
      { bankName, accountType },
      {
        onSuccess: () => {
          setConnected(true);
          setPendingBank(null);
          router.push('/radar');
        },
        onSettled: () => setPendingBank(null),
      },
    );
  };

  const handleDisconnect = (connectionId: string, bankName: string) => {
    if (!confirm(`${bankName} bağlantısını kaldırmak istiyor musun?`)) return;
    disconnectBank.mutate(connectionId);
  };

  return (
    <PhoneShell title="Banka bağla" back hideTabs>
      <WalletReveal balance="₺ 18.400,00" hint="Cüzdanın üzerine gel — bakiyeni gör" />
      <p className="ny-tagline mb-3">
        Hesabını güvenli şekilde bağla. Niyet henüz Open Banking lisanslı değil — demo akışında
        otomatik mock işlem aktarımı yapılır.
      </p>

      {/* Bağlı hesaplar */}
      {(myConnections?.length ?? 0) > 0 && (
        <section className="mb-4">
          <div className="ny-eyebrow mb-2">Bağlı hesaplar</div>
          <div className="space-y-2">
            {myConnections!.map((conn) => (
              <div key={conn.id} className="ny-card flex items-center justify-between !p-3">
                <div className="flex flex-1 items-start gap-3">
                  <CreditCard size={18} className="text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{conn.bankName}</div>
                    {conn.accounts.map((a) => (
                      <div key={a.id} className="text-[11px] opacity-70">
                        {ACCOUNT_TYPE_LABEL[a.type]} · *{a.last4} ·{' '}
                        <span className={a.balance < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {formatTRY(a.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(conn.id, conn.bankName)}
                  disabled={disconnectBank.isPending}
                  className="text-[hsl(var(--muted-foreground))] hover:text-red-500 disabled:opacity-50"
                  aria-label={`${conn.bankName} bağlantısını kaldır`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hesap türü seçici */}
      <section className="mb-3">
        <div className="ny-eyebrow mb-2">Yeni hesap türü</div>
        <div className="grid grid-cols-2 gap-2">
          {(['DEBIT', 'CREDIT_CARD'] as const).map((t) => {
            const active = accountType === t;
            return (
              <button
                key={t}
                onClick={() => setAccountType(t)}
                className={`ny-chip !py-1.5 text-xs ${active ? 'border-primary text-primary' : ''}`}
                aria-label={`${ACCOUNT_TYPE_LABEL[t]} hesap türü`}
              >
                {ACCOUNT_TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Banka listesi — kategoriye ayrılmış */}
      <section className="mb-4">
        <div className="ny-eyebrow mb-2">Bankalar</div>
        {banksLoading || connsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ny-card h-12 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {categoryOrder
              .filter((cat) => banksByCategory[cat].length > 0)
              .map((cat) => (
                <div key={cat}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">
                    {SUPPORTED_BANK_CATEGORY_LABEL[cat]}
                  </div>
                  <div className="space-y-2">
                    {banksByCategory[cat].map((bankId) => {
                      const isConnected = connectedBankIds.has(bankId);
                      const isPending = pendingBank === bankId && connectBank.isPending;
                      const label = SUPPORTED_BANK_LABELS[bankId];
                      return (
                        <button
                          key={bankId}
                          onClick={() => !isConnected && handleConnect(bankId)}
                          disabled={isConnected || isPending}
                          className="ny-card flex w-full items-center justify-between text-left disabled:opacity-70"
                          aria-label={`${label} bağla`}
                        >
                          <span className="flex items-center gap-3">
                            <CreditCard
                              size={20}
                              className={isConnected ? 'text-primary' : 'opacity-70'}
                            />
                            <span className="text-sm">{label}</span>
                          </span>
                          {isPending ? (
                            <Sparkles size={16} className="text-primary animate-pulse" />
                          ) : isConnected ? (
                            <span className="text-primary flex items-center gap-1 text-xs font-semibold">
                              <Check size={14} /> Bağlı
                            </span>
                          ) : (
                            <ArrowRight size={16} className="opacity-50" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {connectBank.isError && (
        <div className="ny-card border-destructive/30 mt-4">
          <div className="text-destructive mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} /> Bağlantı başarısız
          </div>
          <p className="text-sm opacity-70">
            {connectBank.error instanceof Error
              ? connectBank.error.message
              : 'Bilinmeyen hata. Lütfen tekrar dene.'}
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-[10px] opacity-50">
        Open Banking lisansı sonrası gerçek hesap entegrasyonu eklenecek.
      </p>
    </PhoneShell>
  );
}
