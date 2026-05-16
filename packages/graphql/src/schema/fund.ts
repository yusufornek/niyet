import { recommendFunds, type RiskProfile } from '@niyet/core';

import { builder } from '../builder';
import { RiskProfileRef } from './enums';

const FundRecommendationRef = builder.simpleObject('FundRecommendation', {
  fields: (t) => ({
    id: t.string(),
    name: t.string(),
    summary: t.string(),
    riskBand: t.field({ type: RiskProfileRef }),
    horizonBand: t.string(),
    expectedReturnBand: t.string(),
    whyFits: t.string(),
    score: t.int(),
  }),
});

const FundRecommendationInputRef = builder.inputType('FundRecommendationInput', {
  fields: (t) => ({
    riskProfile: t.field({ type: RiskProfileRef, required: true }),
    targetYears: t.int({ required: false }),
    goalId: t.id({ required: false }),
  }),
});

builder.queryField('fundRecommendations', (t) =>
  t.field({
    type: [FundRecommendationRef],
    authScopes: { authenticated: true },
    args: {
      input: t.arg({ type: FundRecommendationInputRef, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const riskProfile = args.input.riskProfile as RiskProfile;
      const now = ctx.now();
      const fallbackYears = clampYears(args.input.targetYears ?? null);

      const goal = args.input.goalId
        ? await ctx.prisma.goal.findFirst({
            where: { id: String(args.input.goalId), userId: ctx.userId! },
            select: { targetDate: true },
          })
        : await ctx.prisma.goal.findFirst({
            where: { userId: ctx.userId!, status: 'ACTIVE' },
            orderBy: { targetDate: 'asc' },
            select: { targetDate: true },
          });

      const computedYears = goal ? yearsUntil(goal.targetDate, now) : null;
      const targetYears = clampYears(computedYears ?? fallbackYears ?? 10) ?? 10;

      return recommendFunds({ riskProfile, targetYears }).map((item) => ({
        ...item,
        score: Math.round(item.score),
      }));
    },
  }),
);

function yearsUntil(targetDate: Date, now: Date): number {
  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) return 1;
  return diffMs / (1000 * 60 * 60 * 24 * 365);
}

function clampYears(years: number | null): number | null {
  if (years === null || Number.isNaN(years) || !Number.isFinite(years)) return null;
  return Math.max(1, Math.min(40, years));
}
