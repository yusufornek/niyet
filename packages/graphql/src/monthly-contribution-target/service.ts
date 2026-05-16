/**
 * MonthlyContributionTargetService — kullanicinin "bu ay X TL mikro katki yap"
 * hedefini takip eder; ay icinde esik gecisi olursa notification uretir.
 *
 * Spending Alert (limit yaklasiyor) PBI'nin simetrigi; bu PBI: katki hedefine
 * yaklasiyor / ulasildi.
 *
 * Idempotency:
 * - lastAlertedMonth + lastAlertedLevel ile dedup.
 * - NEAR -> REACHED escalation YENI notification uretir (kullanici onemli
 *   geçişi kaçırmasın).
 *
 * MicroContribution sayma kurali:
 * - REVERSED hariç tüm contribution amount'larının bu ay toplamı.
 */
import {
  evaluateMonthlyContributionTarget,
  monthlyTargetMonthKey,
  type MonthlyContributionEvaluation,
  type MonthlyContributionShape,
  type MonthlyTargetLevel,
} from '@niyet/core';
import type { PrismaClient, MonthlyContributionTarget } from '@prisma/client';

export interface MonthlyTargetDeps {
  prisma: PrismaClient;
  now: () => Date;
}

export interface MonthlyTargetOutcome {
  targetId: string;
  evaluation: MonthlyContributionEvaluation;
  notificationCreated: boolean;
  notificationId: string | null;
  skippedReason: 'ALREADY_ALERTED_THIS_MONTH' | 'NO_TARGET' | null;
}

export class MonthlyContributionTargetService {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;

  constructor(deps: MonthlyTargetDeps) {
    this.prisma = deps.prisma;
    this.now = deps.now;
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────

  async getForUser(userId: string): Promise<MonthlyContributionTarget | null> {
    return this.prisma.monthlyContributionTarget.findUnique({
      where: { userId },
    });
  }

  /**
   * Upsert pattern — kullanici basina TEK target oldugu icin create + update
   * tek API ile basitlestirilir.
   */
  async upsertTarget(
    userId: string,
    input: { targetAmount: number; warnThresholdPct?: number; active?: boolean },
  ): Promise<MonthlyContributionTarget> {
    if (!(input.targetAmount > 0)) {
      throw new Error('Aylik hedef pozitif olmali.');
    }
    const warn = input.warnThresholdPct ?? 0.9;
    if (warn <= 0 || warn > 1) {
      throw new Error('Erken bilgilendirme esigi 0 ile 1 arasinda olmali.');
    }
    return this.prisma.monthlyContributionTarget.upsert({
      where: { userId },
      create: {
        userId,
        targetAmount: input.targetAmount,
        warnThresholdPct: warn,
        active: input.active ?? true,
      },
      update: {
        targetAmount: input.targetAmount,
        warnThresholdPct: warn,
        ...(input.active != null ? { active: input.active } : {}),
      },
    });
  }

  async deleteTarget(userId: string): Promise<boolean> {
    const owned = await this.prisma.monthlyContributionTarget.findUnique({
      where: { userId },
    });
    if (!owned) return false;
    await this.prisma.monthlyContributionTarget.delete({ where: { userId } });
    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // Evaluation + Notification
  // ─────────────────────────────────────────────────────────────

  /**
   * Saf preview — DB'ye yazmadan "su anki ay nasıl ilerliyorum" bilgisi.
   * UI canlı bar için kullanır.
   */
  async previewForUser(
    userId: string,
    input: { targetAmount: number; warnThresholdPct?: number },
    targetMonthYear?: string,
  ): Promise<MonthlyContributionEvaluation> {
    const monthYear = targetMonthYear ?? monthlyTargetMonthKey(this.now());
    const contribs = await this.fetchMonthContributions(userId, monthYear);
    return evaluateMonthlyContributionTarget({
      contributions: contribs,
      targetAmount: input.targetAmount,
      warnThresholdPct: input.warnThresholdPct,
      monthYear,
    });
  }

  /**
   * Kullanicinin target'ini bu ay icin degerlendir; esik gecisi varsa
   * notification uret. Idempotent.
   */
  async evaluateForUser(
    userId: string,
    targetMonthYear?: string,
  ): Promise<MonthlyTargetOutcome | { skippedReason: 'NO_TARGET' }> {
    const target = await this.prisma.monthlyContributionTarget.findUnique({
      where: { userId },
    });
    if (!target || !target.active) {
      return { skippedReason: 'NO_TARGET' };
    }

    const monthYear = targetMonthYear ?? monthlyTargetMonthKey(this.now());
    const contribs = await this.fetchMonthContributions(userId, monthYear);
    const evaluation = evaluateMonthlyContributionTarget({
      contributions: contribs,
      targetAmount: Number(target.targetAmount),
      warnThresholdPct: Number(target.warnThresholdPct),
      monthYear,
    });

    // BEHIND → sessiz, notification yok
    if (evaluation.level === 'BEHIND') {
      return {
        targetId: target.id,
        evaluation,
        notificationCreated: false,
        notificationId: null,
        skippedReason: null,
      };
    }

    const alreadyAlerted =
      target.lastAlertedMonth === monthYear &&
      isLevelAlreadyReported(target.lastAlertedLevel, evaluation.level);

    if (alreadyAlerted) {
      return {
        targetId: target.id,
        evaluation,
        notificationCreated: false,
        notificationId: null,
        skippedReason: 'ALREADY_ALERTED_THIS_MONTH',
      };
    }

    // Yeni notification + state update (atomic)
    const result = await this.prisma.$transaction(async (db) => {
      const notif = await db.notification.create({
        data: {
          userId: target.userId,
          type: 'GOAL_MILESTONE',
          title: buildTitle(evaluation),
          body: buildBody(evaluation),
          payload: {
            source: 'MONTHLY_CONTRIBUTION_TARGET',
            targetId: target.id,
            level: evaluation.level,
            monthYear,
            contributedAmount: evaluation.contributedAmount,
            targetAmount: evaluation.targetAmount,
            remainingAmount: evaluation.remainingAmount,
            utilizationPct: evaluation.utilizationPct,
          },
        },
      });
      await db.monthlyContributionTarget.update({
        where: { id: target.id },
        data: {
          lastAlertedMonth: monthYear,
          lastAlertedLevel: evaluation.level,
        },
      });
      return notif;
    });

    return {
      targetId: target.id,
      evaluation,
      notificationCreated: true,
      notificationId: result.id,
      skippedReason: null,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private async fetchMonthContributions(
    userId: string,
    monthYear: string,
  ): Promise<MonthlyContributionShape[]> {
    const [yStr, mStr] = monthYear.split('-');
    const start = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(Number(yStr), Number(mStr), 1, 0, 0, 0, 0));
    const rows = await this.prisma.microContribution.findMany({
      where: {
        userId,
        status: { not: 'REVERSED' },
        createdAt: { gte: start, lt: end },
      },
      select: { amount: true, createdAt: true },
    });
    return rows.map((r) => ({ amount: Number(r.amount), createdAt: r.createdAt }));
  }
}

/**
 * Hangi level upgrade'i bildirim gerektirir?
 *
 * - lastLevel=REACHED + yeni=NEAR → dedup (zaten REACHED bildirildi, geri donus
 *   nadir ama olabilir; yine de tekrar uyarma)
 * - lastLevel=REACHED + yeni=REACHED → dedup
 * - lastLevel=NEAR + yeni=REACHED → ESCALATION (yeni notification)
 * - lastLevel=NEAR + yeni=NEAR → dedup
 */
function isLevelAlreadyReported(lastLevel: string | null, newLevel: MonthlyTargetLevel): boolean {
  if (lastLevel === 'REACHED') return true;
  if (lastLevel === 'NEAR' && newLevel === 'NEAR') return true;
  return false;
}

function buildTitle(e: MonthlyContributionEvaluation): string {
  if (e.level === 'REACHED') return 'Bravo! Aylik katki hedefine ulastin';
  return 'Hedefe yaklasiyorsun';
}

function buildBody(e: MonthlyContributionEvaluation): string {
  const pct = Math.round(e.utilizationPct * 100);
  const contrib = formatTRY(e.contributedAmount);
  const target = formatTRY(e.targetAmount);
  if (e.level === 'REACHED') {
    return `Bu ay ${contrib} biriktirdin ve ${target} hedefine ulastin (%${pct}). Duzenli birikim aliskanligini surduruyorsun!`;
  }
  const remaining = formatTRY(Math.max(0, e.remainingAmount));
  return `Bu ay ${contrib} biriktirdin, hedefe ${remaining} kaldi (%${pct}). Devam et!`;
}

function formatTRY(n: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n);
}
