/**
 * User tipi + `me` query + pause mutations.
 */
import { calculatePausedUntil, describePauseStatus, PAUSE_LIMITS } from '@niyet/core';
import { z } from 'zod';

import { builder } from '../builder';

const PauseStatusType = builder.simpleObject('PauseStatus', {
  description:
    'Kullanıcının Nefes Ayı durumu. isPaused=true ise otomatik katkı kuralları ' +
    'atlanır, AI Coach yumuşar. pure logic (`packages/core/pause.ts`).',
  fields: (t) => ({
    isPaused: t.boolean(),
    pausedUntil: t.string({ nullable: true }),
    remainingDays: t.int({ nullable: true }),
    summary: t.string(),
  }),
});

builder.prismaObject('User', {
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    name: t.exposeString('name'),
    age: t.exposeInt('age'),
    monthlyIncome: t.field({
      type: 'NonNegativeFloat',
      resolve: (u) => Number(u.monthlyIncome),
    }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    consentAcceptedAt: t.expose('consentAcceptedAt', { type: 'DateTime', nullable: true }),

    /// Nefes Ayı raw değer — UI tipik olarak pauseStatus üzerinden okur.
    pausedUntil: t.expose('pausedUntil', { type: 'DateTime', nullable: true }),
    /// Pure logic'le derive edilen durum (isPaused, remainingDays, summary).
    pauseStatus: t.field({
      type: PauseStatusType,
      resolve: (user, _args, ctx) => describePauseStatus(user.pausedUntil, ctx.now()),
    }),

    accounts: t.relation('accounts'),
    goals: t.relation('goals'),
    subscriptions: t.relation('subscriptions'),
    rules: t.relation('rules'),
    notifications: t.relation('notifications'),
  }),
});

builder.queryField('me', (t) =>
  t.prismaField({
    type: 'User',
    nullable: true,
    authScopes: { authenticated: true },
    description: 'Authenticated kullanıcının profili (demo akışında Ayşe)',
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      return ctx.prisma.user.findUnique({
        ...query,
        where: { id: ctx.userId },
      });
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Pause mutations — Nefes Ayı (PBI)
// ─────────────────────────────────────────────────────────────

const PauseInputSchema = z.object({
  months: z.number().int().min(PAUSE_LIMITS.minMonths).max(PAUSE_LIMITS.maxMonths),
});

builder.mutationField('pauseContributions', (t) =>
  t.prismaField({
    type: 'User',
    authScopes: { authenticated: true },
    description:
      'Kullanıcının otomatik katkı kurallarını N ay (1-12) süreyle duraklatır. ' +
      "DB'ye `pausedUntil` yazılır; cron'lar ve rule trigger'ları bu tarihe kadar atlar.",
    args: {
      months: t.arg.int({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const { months } = PauseInputSchema.parse({ months: args.months });
      const pausedUntil = calculatePausedUntil(months, ctx.now());
      return ctx.prisma.user.update({
        ...query,
        where: { id: ctx.userId! },
        data: { pausedUntil },
      });
    },
  }),
);

builder.mutationField('resumeContributions', (t) =>
  t.prismaField({
    type: 'User',
    authScopes: { authenticated: true },
    description: "Nefes Ayı'nı manuel olarak sonlandırır (pausedUntil → null).",
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.user.update({
        ...query,
        where: { id: ctx.userId! },
        data: { pausedUntil: null },
      });
    },
  }),
);
