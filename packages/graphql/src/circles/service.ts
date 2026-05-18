/**
 * CirclesService — ortak birikim cemberleri (aile/topluluk).
 *
 * Akis:
 * - createCircle: yeni cember + olusturani admin yap + unique inviteCode ata
 * - joinByInviteCode: kullaniciyi cembere member olarak ekle (idempotent)
 * - leaveCircle: kullanici cemberden ayrilir (admin son uyeyse cember silinmez,
 *   sadece membership silinir; demo'da basit yaklasim)
 * - contributeToCircle: MicroContribution yarat (source=MANUAL, sourceRef=
 *   "circle:<id>") + CircleMembership.contribution'a ekle + milestone notif
 *
 * Idempotency:
 * - inviteCode generation: DB unique constraint + 5 deneme (cakisma cok dusuk)
 * - milestone notification: CircleMilestoneLog @@unique([circleId, percent])
 */
import {
  calculateCircleProgress,
  diffNewMilestones,
  generateInviteCode,
  type CircleMilestoneLevel,
} from '@niyet/core';
import type { PrismaClient, Circle, CircleMembership, CircleType } from '@prisma/client';

export interface CirclesDeps {
  prisma: PrismaClient;
  now: () => Date;
}

export interface CircleWithProgressDTO {
  circle: Circle;
  totalContributed: number;
  progressPct: number;
  highestReachedMilestone: number | null;
  memberCount: number;
  myRole: 'admin' | 'member' | null;
}

export class CirclesService {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;

  constructor(deps: CirclesDeps) {
    this.prisma = deps.prisma;
    this.now = deps.now;
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────

  async createCircle(
    userId: string,
    input: { name: string; target: number; type: CircleType; isPublic?: boolean },
  ): Promise<Circle> {
    if (!input.name?.trim()) throw new Error('Cember adi bos olamaz.');
    if (!(input.target > 0)) throw new Error('Hedef tutar pozitif olmali.');

    // Unique invite code generation (5 deneme - cakisma cok dusuk olsa da)
    let inviteCode: string | null = null;
    for (let i = 0; i < 5; i++) {
      const candidate = generateInviteCode();
      const exists = await this.prisma.circle.findUnique({
        where: { inviteCode: candidate },
        select: { id: true },
      });
      if (!exists) {
        inviteCode = candidate;
        break;
      }
    }
    if (!inviteCode) {
      throw new Error('Davet kodu uretilemedi, lutfen tekrar dene.');
    }

    return this.prisma.$transaction(async (db) => {
      const circle = await db.circle.create({
        data: {
          name: input.name.trim(),
          target: input.target,
          type: input.type,
          isPublic: input.isPublic ?? false,
          inviteCode,
        },
      });
      await db.circleMembership.create({
        data: {
          circleId: circle.id,
          userId,
          contribution: 0,
          role: 'admin',
        },
      });
      return circle;
    });
  }

  async joinByInviteCode(userId: string, code: string): Promise<Circle> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) throw new Error('Davet kodu bos olamaz.');

    const circle = await this.prisma.circle.findUnique({
      where: { inviteCode: trimmed },
    });
    if (!circle) throw new Error('Bu davet kodu gecersiz.');

    const existing = await this.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId } },
    });
    if (existing) {
      // Zaten uye → idempotent, mevcut cemberi don
      return circle;
    }

    await this.prisma.circleMembership.create({
      data: { circleId: circle.id, userId, contribution: 0, role: 'member' },
    });
    return circle;
  }

  async leaveCircle(userId: string, circleId: string): Promise<boolean> {
    const membership = await this.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!membership) throw new Error('Bu cembere uye degilsin.');
    await this.prisma.circleMembership.delete({ where: { id: membership.id } });
    return true;
  }

  async listMembers(
    circleId: string,
  ): Promise<Array<CircleMembership & { user: { id: string; name: string } }>> {
    return this.prisma.circleMembership.findMany({
      where: { circleId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { contribution: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Contribution + milestone
  // ─────────────────────────────────────────────────────────────

  /**
   * Cember'e katki yap — kullanicinin kendi MicroContribution'ini olusturur,
   * CircleMembership.contribution'a ekler, milestone gecisi varsa
   * notification + CircleMilestoneLog uretir.
   *
   * Atomik (tek $transaction). Sadece uye olan kullanici katki yapabilir.
   */
  async contributeToCircle(
    userId: string,
    input: { circleId: string; amount: number; note?: string },
  ): Promise<{
    membershipNewContribution: number;
    microContributionId: string;
    newMilestones: CircleMilestoneLevel[];
    notificationsCreated: number;
  }> {
    if (!(input.amount > 0)) throw new Error('Katki tutari pozitif olmali.');

    const membership = await this.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId: input.circleId, userId } },
    });
    if (!membership) throw new Error('Bu cembere uye degilsin.');

    const triggeredAt = this.now();
    const result = await this.prisma.$transaction(async (db) => {
      // MicroContribution: source=MANUAL (kullanici el ile cembere katki kararı)
      const mc = await db.microContribution.create({
        data: {
          userId,
          amount: input.amount,
          category: null,
          source: 'MANUAL',
          sourceRef: `circle:${input.circleId}`,
          status: 'COMMITTED',
          committedAt: triggeredAt,
          note: input.note ?? `Cember katkisi`,
        },
      });
      const updated = await db.circleMembership.update({
        where: { id: membership.id },
        data: { contribution: { increment: input.amount } },
      });

      // Yeni progress hesabı + milestone diff
      const circle = await db.circle.findUniqueOrThrow({
        where: { id: input.circleId },
      });
      const members = await db.circleMembership.findMany({
        where: { circleId: input.circleId },
        include: { user: { select: { id: true, name: true } } },
      });

      const progress = calculateCircleProgress({
        target: Number(circle.target),
        members: members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          contribution: Number(m.contribution),
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      });

      const existingLogs = await db.circleMilestoneLog.findMany({
        where: { circleId: input.circleId },
        select: { percent: true },
      });
      const loggedLevels = existingLogs.map((l) => l.percent as CircleMilestoneLevel);
      const newMilestones = diffNewMilestones(progress, loggedLevels);

      // Yeni milestone'lar icin log + notification (tum uyeler)
      let notificationsCreated = 0;
      for (const level of newMilestones) {
        await db.circleMilestoneLog.create({
          data: { circleId: input.circleId, percent: level },
        });
        // Tum uyelere notification
        for (const memb of members) {
          await db.notification.create({
            data: {
              userId: memb.userId,
              type: 'GOAL_MILESTONE',
              title: buildMilestoneTitle(circle.name, level),
              body: buildMilestoneBody(
                circle.name,
                level,
                progress.totalContributed,
                Number(circle.target),
              ),
              payload: {
                source: 'CIRCLE_MILESTONE',
                circleId: input.circleId,
                milestone: level,
                totalContributed: progress.totalContributed,
                target: Number(circle.target),
              },
            },
          });
          notificationsCreated++;
        }
      }

      return {
        membershipNewContribution: Number(updated.contribution),
        microContributionId: mc.id,
        newMilestones,
        notificationsCreated,
      };
    });

    return result;
  }
}

function buildMilestoneTitle(circleName: string, percent: CircleMilestoneLevel): string {
  if (percent === 100) return `${circleName}: hedefe ulasildi!`;
  return `${circleName}: %${percent} milestone'una ulasildi`;
}

function buildMilestoneBody(
  circleName: string,
  percent: CircleMilestoneLevel,
  total: number,
  target: number,
): string {
  const totalStr = formatTRY(total);
  const targetStr = formatTRY(target);
  if (percent === 100) {
    return `${circleName} cemberinde ortak hedefe ulastiniz: ${totalStr} / ${targetStr}. Beraber basardiniz!`;
  }
  return `${circleName} cemberinde %${percent} milestone'una ulastiniz (${totalStr} / ${targetStr}). Birlikte devam!`;
}

function formatTRY(n: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n);
}
