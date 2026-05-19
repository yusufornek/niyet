'use client';

/**
 * /cards — "Bağlı Kartlarım" sayfası.
 *
 * Kullanıcının `/connect` üzerinden bağlanan banka hesaplarını flip-card
 * görseliyle gösterir. Her kartın altında bankası + son tasarruf işlemleri
 * (MicroContribution) listelenir.
 *
 * Hover ile kart arkaya döner (CVV strip gösterimi — demo amaçlı).
 */
import { ArrowLeftRight, Building2, CreditCard, Wallet } from 'lucide-react';
import Link from 'next/link';

import { PhoneShell } from '@/components/phone-shell';
import { Spinner } from '@/components/spinner';
import {
  useMe,
  useMicroContributions,
  useMyBankConnections,
  type AccountType,
  type BankConnectionAccount,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

import '@/components/flip-card.css';

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CREDIT_CARD: 'Kredi Kartı',
  DEBIT: 'Vadesiz',
  CHECKING: 'Çek Hesabı',
  SAVINGS: 'Birikim',
};

export default function CardsPage() {
  const { data: connData, isLoading: connLoading } = useMyBankConnections();
  const { data: contribData, isLoading: contribLoading } = useMicroContributions({ limit: 10 });
  const { data: meData } = useMe();

  const connections = connData ?? [];
  const allAccounts = connections.flatMap((c) =>
    c.accounts.map((a) => ({ ...a, bankName: c.bankName })),
  );
  const contributions = contribData?.microContributions ?? [];
  const userName = meData?.me?.name ?? 'Niyet Kullanıcısı';

  return (
    <PhoneShell title="Bağlı Kartlarım" back>
      <p className="ny-tagline mb-4">
        Tasarruflarının otomatik kesildiği bağlı kartların. Karta dokun, arkayı gör.
      </p>

      {connLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Kartlar yükleniyor" />
        </div>
      ) : allAccounts.length === 0 ? (
        <div className="ny-card !p-6 text-center">
          <CreditCard size={36} className="text-primary mx-auto mb-3 opacity-70" />
          <div className="text-sm font-semibold">Henüz bağlı kart yok</div>
          <p className="mt-2 text-xs opacity-60">
            Tasarruf takibi için en az bir banka veya kredi kartını bağlamalısın.
          </p>
          <Link href="/connect" className="ny-pill mt-4 inline-flex">
            Banka bağla
          </Link>
        </div>
      ) : (
        <>
          {/* Kart grid'i */}
          <div className="mb-6 flex flex-wrap justify-center gap-4">
            {allAccounts.map((a) => (
              <FlipCard key={a.id} account={a} bankName={a.bankName} holderName={userName} />
            ))}
          </div>

          {/* Banka bağlantısı özeti */}
          <section className="ny-card mb-3 !p-4">
            <div className="ny-eyebrow mb-2 flex items-center gap-1.5">
              <Building2 size={12} /> Bağlı bankalar
            </div>
            <ul className="space-y-2">
              {connections.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold">{c.bankName}</div>
                    <div className="text-[11px] opacity-60">
                      {c.accounts.length} hesap ·{' '}
                      {new Date(c.connectedAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <Link href="/connect" className="text-primary text-xs font-semibold">
                    Yönet →
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Son tasarruf işlem geçmişi */}
          <section className="ny-card !p-4">
            <div className="ny-eyebrow mb-3 flex items-center gap-1.5">
              <ArrowLeftRight size={12} /> Bu kartlardan kesilen son tasarruflar
            </div>
            {contribLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner />
              </div>
            ) : contributions.length === 0 ? (
              <p className="text-center text-xs opacity-60">Henüz tasarruf işlemi yok.</p>
            ) : (
              <ul className="space-y-2">
                {contributions.slice(0, 8).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 border-b border-[hsl(var(--hairline))] pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {c.note ?? (c.category ? formatCategoryLabel(c.category) : 'Mikro katkı')}
                      </div>
                      <div className="text-[11px] opacity-60">
                        {new Date(c.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {sourceLabel(c.source)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-primary text-sm font-semibold">
                        +{formatTRY(c.amount)}
                      </div>
                      <div className="text-[10px] opacity-50">{statusLabel(c.status)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="mt-4 text-center text-[10px] opacity-50">
            Niyet, bağlı kartlarından harcama olduğunda azaltılabilir tutarı otomatik mikro katkıya
            çevirir.
          </p>
        </>
      )}
    </PhoneShell>
  );
}

interface CardProps {
  account: BankConnectionAccount;
  bankName: string;
  holderName: string;
}

function FlipCard({ account, bankName, holderName }: CardProps) {
  const expMonth = String(((account.last4.charCodeAt(0) + 7) % 12) + 1).padStart(2, '0');
  const expYear = String(27 + (account.last4.charCodeAt(1) % 3));
  return (
    <div
      className="flip-card"
      tabIndex={0}
      aria-label={`${bankName} ${ACCOUNT_TYPE_LABEL[account.type]}`}
    >
      <div className="flip-card-inner">
        {/* Ön yüz */}
        <div className="flip-card-front">
          <div className="flex items-start justify-between">
            <span className="brand">{bankName.toUpperCase()}</span>
            <div className="chip" aria-hidden="true" />
          </div>
          <div className="number">**** **** **** {account.last4}</div>
          <div className="row">
            <div>
              <div className="label">Sahip</div>
              <div className="value">{holderName.toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="label">Son kullanma</div>
              <div className="value">
                {expMonth}/{expYear}
              </div>
            </div>
          </div>
        </div>

        {/* Arka yüz */}
        <div className="flip-card-back">
          <div className="strip" />
          <div className="sig">CVV ***</div>
          <p className="note">
            {ACCOUNT_TYPE_LABEL[account.type]} · Bakiye: {formatTRY(account.balance)}
            <br />
            Niyet demo görseli — gerçek kart bilgisi içermez.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatCategoryLabel(c: string): string {
  const m: Record<string, string> = {
    COFFEE: 'Kahve',
    FOOD_DELIVERY: 'Yemek Siparişi',
    DINING_OUT: 'Dışarı Yemek',
    MARKET: 'Market',
    TRANSPORT: 'Ulaşım',
    SUBSCRIPTIONS: 'Abonelikler',
    ONLINE_SHOPPING: 'Online Alışveriş',
    CLOTHING: 'Giyim',
    ENTERTAINMENT: 'Eğlence',
    FUEL: 'Yakıt',
    BILLS: 'Faturalar',
    HEALTH: 'Sağlık',
    EDUCATION: 'Eğitim',
    SPORTS: 'Spor',
    OTHER: 'Diğer',
  };
  return m[c] ?? c;
}

function sourceLabel(s: string): string {
  const m: Record<string, string> = {
    REDUCIBLE_TRANSACTION: 'Azaltılabilir işlem',
    CATEGORY_BUCKET: 'Kategori farkı',
    MANUAL: 'Manuel katkı',
    RULE_TRIGGERED: 'Otomatik kural',
  };
  return m[s] ?? s;
}

function statusLabel(s: string): string {
  if (s === 'COMMITTED') return 'aktarıldı';
  if (s === 'PENDING') return 'beklemede';
  if (s === 'REVERSED') return 'iade';
  return s;
}
