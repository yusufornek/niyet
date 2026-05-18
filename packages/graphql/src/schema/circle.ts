/**
 * Circle + CircleMembership tipleri + queries + mutations.
 *
 * PBI: ortak birikim cemberleri (aile/topluluk). Davet koduyla katilim,
 * milestone bildirimleri, lider tablosu.
 */
import { z } from 'zod';

import { builder } from '../builder';
import { CirclesService } from '../circles/service';
import { CircleTypeRef } from './enums';

builder.prismaObject('Circle', {
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    target: t.field({ type: 'NonNegativeFloat', resolve: (c) => Number(c.target) }),
    type: t.expose('type', { type: CircleTypeRef }),
    isPublic: t.exposeBoolean('isPublic'),
    inviteCode: t.exposeString('inviteCode', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    members: t.relation('members'),
  }),
});

builder.prismaObject('CircleMembership', {
  fields: (t) => ({
    id: t.exposeID('id'),
    contribution: t.field({
      type: 'NonNegativeFloat',
      resolve: (m) => Number(m.contribution),
    }),
    role: t.exposeString('role'),
    joinedAt: t.expose('joinedAt', { type: 'DateTime' }),
    user: t.relation('user'),
    circle: t.relation('circle'),
  }),
});

builder.queryField('circles', (t) =>
  t.prismaField({
    type: ['Circle'],
    authScopes: { authenticated: true },
    description: 'Kullanıcının üye olduğu çemberler',
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.circle.findMany({
        ...query,
        where: {
          members: { some: { userId: ctx.userId! } },
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  }),
);

builder.queryField('circle', (t) =>
  t.prismaField({
    type: 'Circle',
    nullable: true,
    authScopes: { authenticated: true },
    description: 'Tek bir çember detayı (üye ise).',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.circle.findFirst({
        ...query,
        where: {
          id: String(args.id),
          members: { some: { userId: ctx.userId! } },
        },
      });
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Lider tablosu + progress summary
// ─────────────────────────────────────────────────────────────

const CircleLeaderboardEntryRef = builder.simpleObject('CircleLeaderboardEntry', {
  fields: (t) => ({
    userId: t.id(),
    name: t.string(),
    contribution: t.float(),
    sharePct: t.float(),
    rank: t.int(),
  }),
});

const CircleProgressRef = builder.simpleObject('CircleProgress', {
  description: 'Bir çemberin ilerleme + lider tablosu özetı.',
  fields: (t) => ({
    target: t.float(),
    totalContributed: t.float(),
    remainingAmount: t.float(),
    progressPct: t.float(),
    highestReachedMilestone: t.int({ nullable: true }),
    nextMilestone: t.int({ nullable: true }),
    memberCount: t.int(),
    leaderboard: t.field({ type: [CircleLeaderboardEntryRef] }),
  }),
});

builder.queryField('circleProgress', (t) =>
  t.field({
    type: CircleProgressRef,
    authScopes: { authenticated: true },
    description: 'Çemberin ilerleme + lider tablosu (üye olmalı).',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.userId!;
      const circle = await ctx.prisma.circle.findFirst({
        where: {
          id: String(args.id),
          members: { some: { userId } },
        },
      });
      if (!circle) throw new Error('Çember bulunamadı veya üye değilsin.');

      const members = await ctx.prisma.circleMembership.findMany({
        where: { circleId: circle.id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { contribution: 'desc' },
      });

      // Core saf fn ile hesapla
      const { calculateCircleProgress } = await import('@niyet/core');
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

      return {
        target: progress.target,
        totalContributed: progress.totalContributed,
        remainingAmount: progress.remainingAmount,
        progressPct: progress.progressPct,
        highestReachedMilestone: progress.highestReachedMilestone,
        nextMilestone: progress.nextMilestone,
        memberCount: progress.memberCount,
        leaderboard: progress.leaderboard,
      };
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

const CreateCircleInput = z.object({
  name: z.string().min(1).max(80),
  target: z.number().positive().finite(),
  type: z.enum(['FAMILY', 'COMMUNITY']),
  isPublic: z.boolean().optional(),
});

builder.mutationField('createCircle', (t) =>
  t.prismaField({
    type: 'Circle',
    authScopes: { authenticated: true },
    description: 'Yeni bir ortak birikim çemberi oluştur. Oluşturan admin olur.',
    args: {
      name: t.arg.string({ required: true }),
      target: t.arg.float({ required: true }),
      type: t.arg({ type: CircleTypeRef, required: true }),
      isPublic: t.arg.boolean({ required: false, defaultValue: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      const input = CreateCircleInput.parse({
        name: args.name,
        target: args.target,
        type: args.type,
        isPublic: args.isPublic ?? false,
      });
      const service = new CirclesService({ prisma: ctx.prisma, now: ctx.now });
      const circle = await service.createCircle(userId, input);
      return ctx.prisma.circle.findUniqueOrThrow({
        ...query,
        where: { id: circle.id },
      });
    },
  }),
);

builder.mutationField('joinCircleByInviteCode', (t) =>
  t.prismaField({
    type: 'Circle',
    authScopes: { authenticated: true },
    description: 'Davet kodu ile çembere katıl. Zaten üye ise idempotent.',
    args: { code: t.arg.string({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      const service = new CirclesService({ prisma: ctx.prisma, now: ctx.now });
      const circle = await service.joinByInviteCode(ctx.userId!, args.code);
      return ctx.prisma.circle.findUniqueOrThrow({
        ...query,
        where: { id: circle.id },
      });
    },
  }),
);

builder.mutationField('leaveCircle', (t) =>
  t.boolean({
    authScopes: { authenticated: true },
    description: 'Bir çemberden ayrıl.',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const service = new CirclesService({ prisma: ctx.prisma, now: ctx.now });
      return service.leaveCircle(ctx.userId!, String(args.id));
    },
  }),
);

const ContributeResultRef = builder.simpleObject('CircleContributeResult', {
  fields: (t) => ({
    membershipNewContribution: t.float(),
    microContributionId: t.id(),
    newMilestonesReached: t.field({ type: ['Int'] }),
    notificationsCreated: t.int(),
  }),
});

builder.mutationField('contributeToCircle', (t) =>
  t.field({
    type: ContributeResultRef,
    authScopes: { authenticated: true },
    description:
      'Çembere katkı yap. MicroContribution oluşturur + üye katkını artırır + milestone gecisi varsa tum uyelere bildirim atar.',
    args: {
      circleId: t.arg.id({ required: true }),
      amount: t.arg.float({ required: true }),
      note: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      if (!(args.amount > 0)) throw new Error('Katkı pozitif olmalı.');
      const service = new CirclesService({ prisma: ctx.prisma, now: ctx.now });
      const r = await service.contributeToCircle(ctx.userId!, {
        circleId: String(args.circleId),
        amount: args.amount,
        note: args.note ?? undefined,
      });
      return {
        membershipNewContribution: r.membershipNewContribution,
        microContributionId: r.microContributionId,
        newMilestonesReached: r.newMilestones,
        notificationsCreated: r.notificationsCreated,
      };
    },
  }),
);
