/**
 * CategorySpendingAlertService — kullanicinin "azaltmak istedigim kategoriler"
 * icin aylik limit takibi + esik uyarisi.
 *
 * Akis:
 * - Kullanici bir kategori icin aylik limit + warning yuzdesi belirler.
 * - Service `evaluateForUser` ile mevcut ayin durumunu hesaplar.
 * - Yeni esik gecisi varsa (BELOW→WARNING veya WARNING→OVER) Notification
 *   uretir + alert.lastAlerted* alanlarini gunceller.
 * - Idempotency: ayni ay + ayni level icin tekrar notification uretilmez.
 *
 * Mimari notlar:
 * - Pure logic core'da (`evaluateCategoryThreshold`).
 * - Service sadece DB I/O + Notification yan etkisi.
 * - DI: prisma + now (clock).
 */
import {
  evaluateCategoryThreshold,
  spendingAlertMonthKey,
  type CategoryAlertLevel,
  type CategorySpendingEvaluation,
  type CategorySpendingTxShape,
} from '@niyet/core';
import type { PrismaClient, SpendingCategory, CategorySpendingAlert } from '@prisma/client';

export interface CategorySpendingAlertDeps {
  prisma: PrismaClient;
  now: () => Date;
}

export interface AlertEvaluationOutcome {
  alertId: string;
  category: SpendingCategory;
  evaluation: CategorySpendingEvaluation;
  /// Bu evaluation cagrisi YENI notification uretti mi?
  notificationCreated: boolean;
  notificationId: string | null;
  /// Idempotency dedup: ayni ay+level icin onceden notification var
  skippedReason: 'ALREADY_ALERTED_THIS_MONTH' | null;
}

export class CategorySpendingAlertService {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;

  constructor(deps: CategorySpendingAlertDeps) {
    this.prisma = deps.prisma;
    this.now = deps.now;
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────

  async listForUser(userId: string): Promise<CategorySpendingAlert[]> {
    return this.prisma.categorySpendingAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createAlert(
    userId: string,
    input: { category: SpendingCategory; monthlyLimit: number; warnThresholdPct?: number },
  ): Promise<CategorySpendingAlert> {
    if (!(input.monthlyLimit > 0)) {
      throw new Error('Aylik limit pozitif olmali.');
    }
    const warn = input.warnThresholdPct ?? 0.8;
    if (warn <= 0 || warn > 1) {
      throw new Error('Uyari esigi 0 ile 1 arasinda olmali.');
    }
    return this.prisma.categorySpendingAlert.create({
      data: {
        userId,
        category: input.category,
        monthlyLimit: input.monthlyLimit,
        warnThresholdPct: warn,
        active: true,
      },
    });
  }

  async updateLimit(
    userId: string,
    alertId: string,
    input: { monthlyLimit?: number; warnThresholdPct?: number; active?: boolean },
  ): Promise<CategorySpendingAlert> {
    const owned = await this.prisma.categorySpendingAlert.findFirst({
      where: { id: alertId, userId },
    });
    if (!owned) throw new Error('Limit bulunamadi veya erisim reddedildi.');
    if (input.monthlyLimit != null && !(input.monthlyLimit > 0)) {
      throw new Error('Aylik limit pozitif olmali.');
    }
    if (
      input.warnThresholdPct != null &&
      (input.warnThresholdPct <= 0 || input.warnThresholdPct > 1)
    ) {
      throw new Error('Uyari esigi 0 ile 1 arasinda olmali.');
    }
    return this.prisma.categorySpendingAlert.update({
      where: { id: alertId },
      data: {
        ...(input.monthlyLimit != null ? { monthlyLimit: input.monthlyLimit } : {}),
        ...(input.warnThresholdPct != null ? { warnThresholdPct: input.warnThresholdPct } : {}),
        ...(input.active != null ? { active: input.active } : {}),
      },
    });
  }

  async deleteAlert(userId: string, alertId: string): Promise<void> {
    const owned = await this.prisma.categorySpendingAlert.findFirst({
      where: { id: alertId, userId },
    });
    if (!owned) throw new Error('Limit bulunamadi veya erisim reddedildi.');
    await this.prisma.categorySpendingAlert.delete({ where: { id: alertId } });
  }

  // ─────────────────────────────────────────────────────────────
  // Evaluation + notification
  // ─────────────────────────────────────────────────────────────

  async evaluateAlert(
    alert: CategorySpendingAlert,
    targetMonthYear?: string,
  ): Promise<AlertEvaluationOutcome> {
    const monthYear = targetMonthYear ?? spendingAlertMonthKey(this.now());

    // Bu ay'in transaction'larini cek
    const [yStr, mStr] = monthYear.split('-');
    const start = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(Number(yStr), Number(mStr), 1, 0, 0, 0, 0));
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId: alert.userId,
        category: alert.category,
        occurredAt: { gte: start, lt: end },
      },
      select: { amount: true, category: true, occurredAt: true },
    });

    const txShape: CategorySpendingTxShape[] = txs.map((t) => ({
      amount: Number(t.amount),
      category: t.category,
      occurredAt: t.occurredAt,
    }));

    const evaluation = evaluateCategoryThreshold({
      transactions: txShape,
      category: alert.category,
      monthlyLimit: Number(alert.monthlyLimit),
      warnThresholdPct: Number(alert.warnThresholdPct),
      monthYear,
    });

    // BELOW ise notification yok
    if (evaluation.level === 'BELOW') {
      return {
        alertId: alert.id,
        category: alert.category,
        evaluation,
        notificationCreated: false,
        notificationId: null,
        skippedReason: null,
      };
    }

    // Idempotency: ayni ay'da ayni level icin yeni notification yok.
    // Ama WARNING→OVER escalation YENI notification uretmeli (kullanici "limiti
    // gectim" bilgisi ister, "yaklasiyorum"a ek olarak).
    const alreadyAlertedThisMonth =
      alert.lastAlertedMonth === monthYear &&
      isLevelAlreadyReported(alert.lastAlertedLevel, evaluation.level);

    if (alreadyAlertedThisMonth) {
      return {
        alertId: alert.id,
        category: alert.category,
        evaluation,
        notificationCreated: false,
        notificationId: null,
        skippedReason: 'ALREADY_ALERTED_THIS_MONTH',
      };
    }

    // Yeni notification yarat + alert'i guncelle (atomic)
    const result = await this.prisma.$transaction(async (db) => {
      const notif = await db.notification.create({
        data: {
          userId: alert.userId,
          type: 'SPENDING_ALERT',
          title: buildTitle(evaluation),
          body: buildBody(evaluation),
          payload: {
            source: 'CATEGORY_SPENDING_ALERT',
            alertId: alert.id,
            category: alert.category,
            level: evaluation.level,
            monthYear,
            spentAmount: evaluation.spentAmount,
            monthlyLimit: evaluation.monthlyLimit,
            remainingAmount: evaluation.remainingAmount,
            utilizationPct: evaluation.utilizationPct,
          },
        },
      });
      await db.categorySpendingAlert.update({
        where: { id: alert.id },
        data: {
          lastAlertedMonth: monthYear,
          lastAlertedLevel: evaluation.level,
        },
      });
      return notif;
    });

    return {
      alertId: alert.id,
      category: alert.category,
      evaluation,
      notificationCreated: true,
      notificationId: result.id,
      skippedReason: null,
    };
  }

  /**
   * Kullanicinin tum aktif alert'lerini bu ay icin degerlendir + notification
   * uret. Idempotent.
   */
  async evaluateForUser(
    userId: string,
    targetMonthYear?: string,
  ): Promise<AlertEvaluationOutcome[]> {
    const alerts = await this.prisma.categorySpendingAlert.findMany({
      where: { userId, active: true },
    });
    const outcomes: AlertEvaluationOutcome[] = [];
    for (const a of alerts) {
      outcomes.push(await this.evaluateAlert(a, targetMonthYear));
    }
    return outcomes;
  }

  /**
   * "Eger simdi degerlendirilirse" preview — Notification YARATMAZ. UI'da
   * kullaniciya gostermek icin.
   */
  async previewAlert(
    userId: string,
    input: { category: SpendingCategory; monthlyLimit: number; warnThresholdPct?: number },
    targetMonthYear?: string,
  ): Promise<CategorySpendingEvaluation> {
    const monthYear = targetMonthYear ?? spendingAlertMonthKey(this.now());
    const [yStr, mStr] = monthYear.split('-');
    const start = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(Number(yStr), Number(mStr), 1, 0, 0, 0, 0));
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        category: input.category,
        occurredAt: { gte: start, lt: end },
      },
      select: { amount: true, category: true, occurredAt: true },
    });
    return evaluateCategoryThreshold({
      transactions: txs.map((t) => ({
        amount: Number(t.amount),
        category: t.category,
        occurredAt: t.occurredAt,
      })),
      category: input.category,
      monthlyLimit: input.monthlyLimit,
      warnThresholdPct: input.warnThresholdPct,
      monthYear,
    });
  }
}

/**
 * Daha onceden bu ay icin WARNING/OVER notification uretildi mi?
 *
 * - lastAlertedLevel=OVER + yeni level=OVER → tekrar UYARMA
 * - lastAlertedLevel=OVER + yeni level=WARNING → tekrar UYARMA (zaten OVER bildirildi)
 * - lastAlertedLevel=WARNING + yeni level=OVER → ESCALATION, yeni notification uret
 * - lastAlertedLevel=WARNING + yeni level=WARNING → tekrar UYARMA
 */
function isLevelAlreadyReported(lastLevel: string | null, newLevel: CategoryAlertLevel): boolean {
  if (lastLevel === 'OVER') return true; // OVER en yuksek
  if (lastLevel === 'WARNING' && newLevel === 'WARNING') return true;
  return false;
}

function buildTitle(e: CategorySpendingEvaluation): string {
  if (e.level === 'OVER') return `${formatCategory(e.category)}: aylik limit asildi`;
  return `${formatCategory(e.category)}: limit yaklasiyor`;
}

function buildBody(e: CategorySpendingEvaluation): string {
  const pct = Math.round(e.utilizationPct * 100);
  const spent = formatTRY(e.spentAmount);
  const limit = formatTRY(e.monthlyLimit);
  if (e.level === 'OVER') {
    const over = formatTRY(Math.abs(e.remainingAmount));
    return `Bu ay ${formatCategory(e.category)} icin ${spent} harcadin (limit ${limit}). Limiti ${over} astin (%${pct}).`;
  }
  return `Bu ay ${formatCategory(e.category)} icin ${spent} harcadin (limit ${limit}). Limitin %${pct}'sine ulastin.`;
}

function formatCategory(c: SpendingCategory): string {
  const m: Record<string, string> = {
    MARKET: 'Market',
    FOOD_DELIVERY: 'Yemek Siparisi',
    COFFEE: 'Kahve',
    DINING_OUT: 'Disarida Yemek',
    TRANSPORT: 'Ulasim',
    FUEL: 'Yakit',
    BILLS: 'Faturalar',
    SUBSCRIPTIONS: 'Abonelikler',
    ONLINE_SHOPPING: 'Online Alisveris',
    CLOTHING: 'Giyim',
    HEALTH: 'Saglik',
    ENTERTAINMENT: 'Eglence',
    EDUCATION: 'Egitim',
    SPORTS: 'Spor',
    OTHER: 'Diger',
  };
  return m[c] ?? c;
}

function formatTRY(n: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n);
}
