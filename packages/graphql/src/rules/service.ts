import { isUserPaused } from '@niyet/core';
import type { PrismaClient, Prisma, Rule } from '@prisma/client';

export type RuleFrequency = 'WEEKLY' | 'MONTHLY' | 'PAYDAY' | 'ONE_TIME';

export interface CreateRuleInput {
  label: string;
  amount: number;
  frequency: RuleFrequency;
  /// Yalnızca frequency='PAYDAY' iken anlamlı; verilirse User.payday set edilir.
  payday?: number | null;
}

export interface UpdateRuleInput {
  label?: string;
  amount?: number;
  active?: boolean;
}

export interface RuleTriggerResult {
  ruleId: string;
  userId: string;
  amount: number;
  microContributionId: string;
  notificationId: string;
}

export interface PaydayBatchResult {
  date: string; // ISO date (YYYY-MM-DD)
  dayOfMonth: number;
  usersChecked: number;
  triggered: number;
  skippedAlreadyTriggered: number;
  /** Kullanıcı Nefes Ayı'nda olduğu için atlanan rule sayısı */
  skippedPaused: number;
  errors: Array<{ ruleId: string; userId: string; error: string }>;
}

export interface RulesServiceDependencies {
  prisma: PrismaClient;
  now: () => Date;
}

export class RulesService {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;

  constructor(deps: RulesServiceDependencies) {
    this.prisma = deps.prisma;
    this.now = deps.now;
  }

  async listRules(userId: string): Promise<Rule[]> {
    return this.prisma.rule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(userId: string, input: CreateRuleInput): Promise<Rule> {
    if (input.frequency === 'PAYDAY') {
      if (input.payday == null) {
        throw new Error('Maaş günü kuralı için ayın hangi günü olduğunu belirtmelisin.');
      }
      if (!Number.isInteger(input.payday) || input.payday < 1 || input.payday > 31) {
        throw new Error('Maaş günü 1 ile 31 arasında olmalı.');
      }
      // User.payday'i set et (idempotent — başka kural varsa override eder)
      await this.prisma.user.update({
        where: { id: userId },
        data: { payday: input.payday },
      });
    }

    return this.prisma.rule.create({
      data: {
        userId,
        label: input.label.trim(),
        amount: input.amount,
        frequency: input.frequency,
        active: true,
      },
    });
  }

  async updateRule(userId: string, ruleId: string, input: UpdateRuleInput): Promise<Rule> {
    const owned = await this.prisma.rule.findFirst({ where: { id: ruleId, userId } });
    if (!owned) {
      throw new Error('Kural bulunamadı veya erişim reddedildi.');
    }
    const data: Prisma.RuleUpdateInput = {};
    if (input.label !== undefined) data.label = input.label.trim();
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.active !== undefined) data.active = input.active;
    return this.prisma.rule.update({ where: { id: ruleId }, data });
  }

  async deleteRule(userId: string, ruleId: string): Promise<Rule> {
    const owned = await this.prisma.rule.findFirst({ where: { id: ruleId, userId } });
    if (!owned) {
      throw new Error('Kural bulunamadı veya erişim reddedildi.');
    }
    return this.prisma.rule.delete({ where: { id: ruleId } });
  }

  /// Kullanıcı UI'dan "Şimdi tetikle" derse veya cron PAYDAY rule için.
  async triggerRule(userId: string, ruleId: string): Promise<RuleTriggerResult> {
    const rule = await this.prisma.rule.findFirst({
      where: { id: ruleId, userId, active: true },
    });
    if (!rule) {
      throw new Error('Kural bulunamadı, pasif ya da erişim reddedildi.');
    }
    return this.executeRule(rule);
  }

  /// Vercel cron: bugünün gününe denk gelen User.payday'leri bul, aktif
  /// PAYDAY kurallarını tetikle. Idempotent — aynı gün ikinci kez çalışsa
  /// (örn. retry) yeni MicroContribution oluşturmaz.
  async triggerDuePaydayRules(today?: Date): Promise<PaydayBatchResult> {
    const date = today ?? this.now();
    const dayOfMonth = date.getDate();
    const isoDate = formatIsoDate(date);

    const users = await this.prisma.user.findMany({
      where: { payday: dayOfMonth },
      include: {
        rules: { where: { active: true, frequency: 'PAYDAY' } },
      },
    });

    const result: PaydayBatchResult = {
      date: isoDate,
      dayOfMonth,
      usersChecked: users.length,
      triggered: 0,
      skippedAlreadyTriggered: 0,
      skippedPaused: 0,
      errors: [],
    };

    const { start: dayStart, end: dayEnd } = boundsOfDay(date);

    for (const user of users) {
      // Nefes Ayı kontrolü — kullanıcı paused ise tüm rule'larını atla.
      // Aynı user için birden çok rule varsa hepsi skippedPaused'a sayılır.
      if (isUserPaused(user.pausedUntil, date)) {
        result.skippedPaused += user.rules.length;
        continue;
      }
      for (const rule of user.rules) {
        const already = await this.prisma.microContribution.findFirst({
          where: {
            ruleId: rule.id,
            userId: user.id,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
          select: { id: true },
        });
        if (already) {
          result.skippedAlreadyTriggered++;
          continue;
        }
        try {
          await this.executeRule(rule);
          result.triggered++;
        } catch (error) {
          result.errors.push({
            ruleId: rule.id,
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return result;
  }

  private async executeRule(rule: Rule): Promise<RuleTriggerResult> {
    const triggeredAt = this.now();
    const amount = Number(rule.amount); // Prisma Decimal → number
    const mc = await this.prisma.microContribution.create({
      data: {
        userId: rule.userId,
        ruleId: rule.id,
        amount: rule.amount,
        source: 'RULE_TRIGGERED',
        sourceRef: rule.id,
        status: 'COMMITTED',
        committedAt: triggeredAt,
        category: null,
        note: `Otomatik kural: ${rule.label}`,
      },
    });
    const notif = await this.prisma.notification.create({
      data: {
        userId: rule.userId,
        type: 'RULE_TRIGGERED',
        title: 'Otomatik birikim eklendi',
        body: `${rule.label}: ${formatTry(amount)} emeklilik katkına eklendi.`,
      },
    });
    return {
      ruleId: rule.id,
      userId: rule.userId,
      amount,
      microContributionId: mc.id,
      notificationId: notif.id,
    };
  }
}

function boundsOfDay(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTry(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount);
}
