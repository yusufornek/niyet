/**
 * BankConnectionService — Niyet'in banka/kart hesabi baglama akisi.
 *
 * PBI: "Banka veya kredi karti hesabimi uygulamaya baglayabilmek istiyorum;
 * boylece harcama verilerim analiz edilerek azaltilabilir harcamalarim
 * tespit edilebilsin."
 *
 * Mimari notu (CLAUDE.md + ENGINEERING.md):
 * - Niyet hentu Open Banking lisansli **degil** — gercek banka API'si yok.
 * - Bu service `ConnectBankAdapter` interface'i ile soyutlandi; bugun
 *   `MockBankConnectionAdapter` ile son 30 gun mock transaction yaratir,
 *   ileride lisans alinca `OpenBankingAdapter` impl edilir.
 * - Service DB'ye GERCEK BankConnection + Account + Transaction yazar
 *   (Zustand mock state degil) — bu sayede analiz, radar, score, hedefler
 *   tum stack uctan uca gercek veri uzerinde calisir.
 */
import type { AccountType, PrismaClient, SpendingCategory } from '@prisma/client';

/**
 * Turkiye'de tuketici hesaplari acilabilen bankalar — TCMB / Wikipedia
 * "List of banks in Turkey" listesinden derlenmistir. Yatirim/kalkinma
 * bankalari dahil edilmedi (bireysel musteri kabul etmez).
 *
 * GraphQL enum value'lari sadece [A-Za-z0-9_] olmali — identifier'lar
 * SCREAMING_SNAKE; DB ve UI'da gosterilecek "guzel" ad SUPPORTED_BANK_LABELS
 * map'inde.
 *
 * Kategoriler (UI gruplandirma icin SUPPORTED_BANK_CATEGORIES'a bak):
 * - Kamu (3): Ziraat, Halkbank, VakifBank
 * - Ozel sermayeli mevduat (11): Akbank, Garanti BBVA, IS, Yapi Kredi, TEB,
 *   Sekerbank, Anadolubank, Fibabanka, Alternatif, Turkish, Tekstilbank
 * - Yabanci sermayeli (8): HSBC, Citi, ING, Denizbank, ICBC TR, QNB
 *   Finansbank, Burgan, Odeabank
 * - Katilim (6): Ziraat Katilim, Vakif Katilim, Emlak Katilim, Turkiye
 *   Finans, Albaraka Turk, Kuveyt Turk
 * - Dijital (2): Enpara, N Kolay
 */
export type SupportedBank =
  // Kamu
  | 'ZIRAAT'
  | 'HALKBANK'
  | 'VAKIFBANK'
  // Ozel sermayeli mevduat
  | 'AKBANK'
  | 'GARANTI_BBVA'
  | 'IS_BANKASI'
  | 'YAPI_KREDI'
  | 'TEB'
  | 'SEKERBANK'
  | 'ANADOLUBANK'
  | 'FIBABANKA'
  | 'ALTERNATIF_BANK'
  | 'TURKISH_BANK'
  | 'TEKSTILBANK'
  // Yabanci sermayeli
  | 'HSBC'
  | 'CITIBANK'
  | 'ING_BANK'
  | 'DENIZBANK'
  | 'ICBC_TURKEY'
  | 'QNB_FINANSBANK'
  | 'BURGAN_BANK'
  | 'ODEABANK'
  // Katilim
  | 'ZIRAAT_KATILIM'
  | 'VAKIF_KATILIM'
  | 'EMLAK_KATILIM'
  | 'TURKIYE_FINANS'
  | 'ALBARAKA_TURK'
  | 'KUVEYT_TURK'
  // Dijital
  | 'ENPARA'
  | 'N_KOLAY';

export const SUPPORTED_BANKS: SupportedBank[] = [
  'ZIRAAT',
  'HALKBANK',
  'VAKIFBANK',
  'AKBANK',
  'GARANTI_BBVA',
  'IS_BANKASI',
  'YAPI_KREDI',
  'TEB',
  'SEKERBANK',
  'ANADOLUBANK',
  'FIBABANKA',
  'ALTERNATIF_BANK',
  'TURKISH_BANK',
  'TEKSTILBANK',
  'HSBC',
  'CITIBANK',
  'ING_BANK',
  'DENIZBANK',
  'ICBC_TURKEY',
  'QNB_FINANSBANK',
  'BURGAN_BANK',
  'ODEABANK',
  'ZIRAAT_KATILIM',
  'VAKIF_KATILIM',
  'EMLAK_KATILIM',
  'TURKIYE_FINANS',
  'ALBARAKA_TURK',
  'KUVEYT_TURK',
  'ENPARA',
  'N_KOLAY',
];

/// Identifier → DB'ye ve UI'a yazilan tam ad
export const SUPPORTED_BANK_LABELS: Record<SupportedBank, string> = {
  // Kamu
  ZIRAAT: 'Ziraat Bankası',
  HALKBANK: 'Halkbank',
  VAKIFBANK: 'VakıfBank',
  // Ozel sermayeli
  AKBANK: 'Akbank',
  GARANTI_BBVA: 'Garanti BBVA',
  IS_BANKASI: 'Türkiye İş Bankası',
  YAPI_KREDI: 'Yapı Kredi',
  TEB: 'Türk Ekonomi Bankası',
  SEKERBANK: 'Şekerbank',
  ANADOLUBANK: 'Anadolubank',
  FIBABANKA: 'Fibabanka',
  ALTERNATIF_BANK: 'Alternatif Bank',
  TURKISH_BANK: 'Turkish Bank',
  TEKSTILBANK: 'Tekstilbank',
  // Yabanci
  HSBC: 'HSBC Türkiye',
  CITIBANK: 'Citibank',
  ING_BANK: 'ING Bank Türkiye',
  DENIZBANK: 'DenizBank',
  ICBC_TURKEY: 'ICBC Turkey Bank',
  QNB_FINANSBANK: 'QNB Finansbank',
  BURGAN_BANK: 'Burgan Bank',
  ODEABANK: 'Odeabank',
  // Katilim
  ZIRAAT_KATILIM: 'Ziraat Katılım',
  VAKIF_KATILIM: 'Vakıf Katılım',
  EMLAK_KATILIM: 'Türkiye Emlak Katılım',
  TURKIYE_FINANS: 'Türkiye Finans',
  ALBARAKA_TURK: 'Albaraka Türk',
  KUVEYT_TURK: 'Kuveyt Türk',
  // Dijital
  ENPARA: 'Enpara.com',
  N_KOLAY: 'N Kolay',
};

export type SupportedBankCategory = 'PUBLIC' | 'PRIVATE' | 'FOREIGN' | 'PARTICIPATION' | 'DIGITAL';

export const SUPPORTED_BANK_CATEGORIES: Record<SupportedBank, SupportedBankCategory> = {
  ZIRAAT: 'PUBLIC',
  HALKBANK: 'PUBLIC',
  VAKIFBANK: 'PUBLIC',
  AKBANK: 'PRIVATE',
  GARANTI_BBVA: 'PRIVATE',
  IS_BANKASI: 'PRIVATE',
  YAPI_KREDI: 'PRIVATE',
  TEB: 'PRIVATE',
  SEKERBANK: 'PRIVATE',
  ANADOLUBANK: 'PRIVATE',
  FIBABANKA: 'PRIVATE',
  ALTERNATIF_BANK: 'PRIVATE',
  TURKISH_BANK: 'PRIVATE',
  TEKSTILBANK: 'PRIVATE',
  HSBC: 'FOREIGN',
  CITIBANK: 'FOREIGN',
  ING_BANK: 'FOREIGN',
  DENIZBANK: 'FOREIGN',
  ICBC_TURKEY: 'FOREIGN',
  QNB_FINANSBANK: 'FOREIGN',
  BURGAN_BANK: 'FOREIGN',
  ODEABANK: 'FOREIGN',
  ZIRAAT_KATILIM: 'PARTICIPATION',
  VAKIF_KATILIM: 'PARTICIPATION',
  EMLAK_KATILIM: 'PARTICIPATION',
  TURKIYE_FINANS: 'PARTICIPATION',
  ALBARAKA_TURK: 'PARTICIPATION',
  KUVEYT_TURK: 'PARTICIPATION',
  ENPARA: 'DIGITAL',
  N_KOLAY: 'DIGITAL',
};

export interface ConnectBankInput {
  userId: string;
  bankName: SupportedBank;
  /// Default DEBIT — kullanıcı CREDIT_CARD secebilir
  accountType?: AccountType;
  /// Hesap takma adi (UI'da gosterilecek)
  nickname?: string;
}

export interface ConnectBankResult {
  bankConnectionId: string;
  accountId: string;
  /// Olusturulan mock transaction sayisi
  transactionsCreated: number;
  /// Acilan hesabin last4 sayisi
  last4: string;
}

/**
 * Banka bagri adapter contract'i. Gercek Open Banking'e gecisle MockImpl
 * yerine RealImpl yazilir; service tarafi degismez.
 */
export interface ConnectBankAdapter {
  /// Banka baglanti + hesap + son 30 gun islem turetir; DB'ye yazar.
  /// Atomik bir is birimi dondurur (caller transaction icine sarar).
  generateInitialState(input: {
    userId: string;
    bankName: SupportedBank;
    accountType: AccountType;
    nickname?: string;
  }): Promise<{
    accountInitialBalance: number;
    last4: string;
    /// Yaratilacak transaction'larin parametre seti — service DB'ye yazar.
    transactions: Array<{
      amount: number;
      merchant: string;
      category: SpendingCategory;
      occurredAt: Date;
      isRecurring: boolean;
    }>;
  }>;
}

export interface BankConnectionDeps {
  prisma: PrismaClient;
  now: () => Date;
  adapter?: ConnectBankAdapter;
}

export class BankConnectionService {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;
  private readonly adapter: ConnectBankAdapter;

  constructor(deps: BankConnectionDeps) {
    this.prisma = deps.prisma;
    this.now = deps.now;
    this.adapter = deps.adapter ?? new MockBankConnectionAdapter(deps.now);
  }

  // ─────────────────────────────────────────────────────────────
  // Listeleme
  // ─────────────────────────────────────────────────────────────

  async listForUser(userId: string) {
    return this.prisma.bankConnection.findMany({
      where: { userId, active: true },
      include: { accounts: true },
      orderBy: { connectedAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Bagla
  // ─────────────────────────────────────────────────────────────

  /**
   * Bir bankayi kullaniciya bagla. Idempotent degil — ayni banka adi tekrar
   * baglanirsa ikinci bir kayit acilir (kullanici ayni bankada birden fazla
   * kart icin makul senaryo). Ama AYNI bankada (ayni isim) AKTIF baglanti
   * varsa hata atilir; once disconnect gerekir.
   */
  async connect(input: ConnectBankInput): Promise<ConnectBankResult> {
    if (!SUPPORTED_BANKS.includes(input.bankName)) {
      throw new Error(`Desteklenmeyen banka: ${input.bankName}`);
    }
    const accountType = input.accountType ?? 'DEBIT';

    const bankLabel = SUPPORTED_BANK_LABELS[input.bankName];

    const existingActive = await this.prisma.bankConnection.findFirst({
      where: {
        userId: input.userId,
        bankName: bankLabel,
        active: true,
      },
      select: { id: true },
    });
    if (existingActive) {
      throw new Error(`${bankLabel} hesabin zaten bagli. Once mevcut baglantiyi kaldir.`);
    }

    const mock = await this.adapter.generateInitialState({
      userId: input.userId,
      bankName: input.bankName,
      accountType,
      nickname: input.nickname,
    });

    return this.prisma.$transaction(async (db) => {
      const conn = await db.bankConnection.create({
        data: {
          userId: input.userId,
          bankName: bankLabel,
          connectedAt: this.now(),
          active: true,
        },
      });
      const account = await db.account.create({
        data: {
          userId: input.userId,
          bankConnId: conn.id,
          type: accountType,
          last4: mock.last4,
          nickname: input.nickname ?? defaultNickname(accountType),
          balance: mock.accountInitialBalance,
        },
      });

      if (mock.transactions.length > 0) {
        await db.transaction.createMany({
          data: mock.transactions.map((tx) => ({
            userId: input.userId,
            accountId: account.id,
            amount: tx.amount,
            merchant: tx.merchant,
            description: null,
            occurredAt: tx.occurredAt,
            category: tx.category,
            isRecurring: tx.isRecurring,
            // AI henuz calismadi — opportunity null + isReducible false; runAnalysis sonra doldurur.
            isReducible: false,
            opportunity: null,
          })),
        });
      }

      return {
        bankConnectionId: conn.id,
        accountId: account.id,
        transactionsCreated: mock.transactions.length,
        last4: mock.last4,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Bagdas kaldir
  // ─────────────────────────────────────────────────────────────

  /**
   * Bir banka baglantisini "pasif" yap. Hesap + transaction'lar SILINMEZ
   * (analiz gecmisi korunur). active=false + disconnectedAt set.
   */
  async disconnect(userId: string, connectionId: string): Promise<boolean> {
    const conn = await this.prisma.bankConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!conn) throw new Error('Banka baglantisi bulunamadi.');
    if (!conn.active) return false;
    await this.prisma.bankConnection.update({
      where: { id: connectionId },
      data: { active: false, disconnectedAt: this.now() },
    });
    return true;
  }
}

function defaultNickname(type: AccountType): string {
  switch (type) {
    case 'CREDIT_CARD':
      return 'Kredi Kartı';
    case 'DEBIT':
      return 'Vadesiz';
    case 'CHECKING':
      return 'Çek Hesabı';
    case 'SAVINGS':
      return 'Birikim';
  }
}

// ─────────────────────────────────────────────────────────────
// MockBankConnectionAdapter — demo'da kullanılan deterministic mock akis.
// ─────────────────────────────────────────────────────────────

/**
 * Demo amacli mock bank adapter. Son 30 gun icinde 15 transaction (5 kategori
 * x 3 islem) uretir. Demo'nun "uctan uca" akisi icin yeterli veri seti.
 *
 * Gercek Open Banking entegrasyonu cikinca bu adapter yerine RealOpenBanking
 * adapter implementasyonu yazilir; service degismez.
 */
export class MockBankConnectionAdapter implements ConnectBankAdapter {
  private readonly now: () => Date;

  constructor(now: () => Date) {
    this.now = now;
  }

  async generateInitialState(input: {
    userId: string;
    bankName: SupportedBank;
    accountType: AccountType;
  }): Promise<{
    accountInitialBalance: number;
    last4: string;
    transactions: Array<{
      amount: number;
      merchant: string;
      category: SpendingCategory;
      occurredAt: Date;
      isRecurring: boolean;
    }>;
  }> {
    const baseDate = this.now();
    const last4 = String(Math.floor(1000 + Math.random() * 9000));

    // Kredi karti negatif bakiye, vadesiz pozitif
    const accountInitialBalance =
      input.accountType === 'CREDIT_CARD'
        ? -Math.round(500 + Math.random() * 2500)
        : Math.round(2000 + Math.random() * 6000);

    const transactions = generateMockTransactions(baseDate);

    return Promise.resolve({
      accountInitialBalance,
      last4,
      transactions,
    });
  }
}

interface MockTxTemplate {
  category: SpendingCategory;
  merchants: string[];
  amountRange: [number, number];
  occurrences: number;
  isRecurring?: boolean;
}

const MOCK_TX_TEMPLATES: MockTxTemplate[] = [
  {
    category: 'COFFEE',
    merchants: ['Starbucks', 'Espressolab', 'Tchibo', 'Coffee Lab'],
    amountRange: [80, 180],
    occurrences: 6,
  },
  {
    category: 'FOOD_DELIVERY',
    merchants: ['Yemeksepeti', 'Getir', 'Trendyol Yemek'],
    amountRange: [120, 300],
    occurrences: 4,
  },
  {
    category: 'DINING_OUT',
    merchants: ['Big Chefs', 'Bursa İskender', 'Hamdi Restaurant', 'Kebapçı Mahmut'],
    amountRange: [200, 600],
    occurrences: 3,
  },
  {
    category: 'MARKET',
    merchants: ['Migros', 'CarrefourSA', 'A101'],
    amountRange: [180, 550],
    occurrences: 4,
  },
  {
    category: 'TRANSPORT',
    merchants: ['BiTaksi', 'Uber', 'İBB Kart'],
    amountRange: [40, 180],
    occurrences: 5,
  },
  {
    category: 'SUBSCRIPTIONS',
    merchants: ['Netflix', 'Spotify', 'YouTube Premium'],
    amountRange: [60, 200],
    occurrences: 2,
    isRecurring: true,
  },
  {
    category: 'ONLINE_SHOPPING',
    merchants: ['Trendyol', 'Hepsiburada', 'Amazon TR'],
    amountRange: [150, 800],
    occurrences: 3,
  },
];

function generateMockTransactions(baseDate: Date): Array<{
  amount: number;
  merchant: string;
  category: SpendingCategory;
  occurredAt: Date;
  isRecurring: boolean;
}> {
  const result: Array<{
    amount: number;
    merchant: string;
    category: SpendingCategory;
    occurredAt: Date;
    isRecurring: boolean;
  }> = [];

  for (const tmpl of MOCK_TX_TEMPLATES) {
    for (let i = 0; i < tmpl.occurrences; i++) {
      const dayOffset = Math.floor(Math.random() * 30);
      const occurredAt = new Date(baseDate);
      occurredAt.setDate(occurredAt.getDate() - dayOffset);
      occurredAt.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0, 0);
      const [min, max] = tmpl.amountRange;
      const amount = Math.round(min + Math.random() * (max - min));
      const merchant = tmpl.merchants[Math.floor(Math.random() * tmpl.merchants.length)]!;
      result.push({
        amount,
        merchant,
        category: tmpl.category,
        occurredAt,
        isRecurring: tmpl.isRecurring ?? false,
      });
    }
  }

  // Tarih azalan sirala (ui'da en yeni en üst)
  return result.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
