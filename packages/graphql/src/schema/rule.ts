/**
 * Rule + payday auto-contribution operations.
 */
import { z } from 'zod';

import { builder } from '../builder';
import type { GraphQLContext } from '../context';
import { RulesService } from '../rules/service';
import { RuleFrequencyRef } from './enums';

const RuleRef = builder.prismaObject('Rule', {
  fields: (t) => ({
    id: t.exposeID('id'),
    label: t.exposeString('label'),
    amount: t.field({ type: 'NonNegativeFloat', resolve: (r) => Number(r.amount) }),
    frequency: t.field({ type: RuleFrequencyRef, resolve: (r) => r.frequency }),
    active: t.exposeBoolean('active'),
    createdAt: t.field({ type: 'DateTime', resolve: (r) => r.createdAt }),
  }),
});

const RuleTriggerResultRef = builder
  .objectRef<{
    ruleId: string;
    userId: string;
    amount: number;
    microContributionId: string;
    notificationId: string;
  }>('RuleTriggerResult')
  .implement({
    fields: (t) => ({
      ruleId: t.exposeID('ruleId'),
      userId: t.exposeID('userId'),
      amount: t.exposeFloat('amount'),
      microContributionId: t.exposeID('microContributionId'),
      notificationId: t.exposeID('notificationId'),
    }),
  });

const CreateRuleInputType = builder.inputType('CreateRuleInput', {
  fields: (t) => ({
    label: t.string({ required: true }),
    amount: t.float({ required: true }),
    frequency: t.field({ type: RuleFrequencyRef, required: true }),
    /// frequency='PAYDAY' iken zorunlu. Ayın 1-31. günü; User.payday'i set eder.
    payday: t.int({ required: false }),
  }),
});

const UpdateRuleInputType = builder.inputType('UpdateRuleInput', {
  fields: (t) => ({
    label: t.string({ required: false }),
    amount: t.float({ required: false }),
    active: t.boolean({ required: false }),
  }),
});

const CreateRuleSchema = z.object({
  label: z.string().min(1).max(80),
  amount: z.number().positive().max(100000),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'PAYDAY', 'ONE_TIME']),
  payday: z.number().int().min(1).max(31).nullable().optional(),
});

const UpdateRuleSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  amount: z.number().positive().max(100000).optional(),
  active: z.boolean().optional(),
});

const RuleIdSchema = z.object({ ruleId: z.string().cuid() });

function serviceFromContext(ctx: GraphQLContext) {
  return new RulesService({ prisma: ctx.prisma, now: ctx.now });
}

builder.queryField('rules', (t) =>
  t.prismaField({
    type: [RuleRef],
    authScopes: { authenticated: true },
    resolve: (query, _root, _args, ctx) =>
      ctx.prisma.rule.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { createdAt: 'desc' },
      }),
  }),
);

builder.mutationField('createRule', (t) =>
  t.prismaField({
    type: RuleRef,
    authScopes: { authenticated: true },
    args: { input: t.arg({ type: CreateRuleInputType, required: true }) },
    resolve: async (query, _root, args, ctx) => {
      const input = CreateRuleSchema.parse(args.input);
      const rule = await serviceFromContext(ctx).createRule(ctx.userId!, input);
      return ctx.prisma.rule.findUniqueOrThrow({ ...query, where: { id: rule.id } });
    },
  }),
);

builder.mutationField('updateRule', (t) =>
  t.prismaField({
    type: RuleRef,
    authScopes: { authenticated: true },
    args: {
      ruleId: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateRuleInputType, required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const { ruleId } = RuleIdSchema.parse({ ruleId: String(args.ruleId) });
      const input = UpdateRuleSchema.parse(args.input);
      const rule = await serviceFromContext(ctx).updateRule(ctx.userId!, ruleId, input);
      return ctx.prisma.rule.findUniqueOrThrow({ ...query, where: { id: rule.id } });
    },
  }),
);

builder.mutationField('deleteRule', (t) =>
  t.field({
    type: 'Boolean',
    authScopes: { authenticated: true },
    args: { ruleId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const { ruleId } = RuleIdSchema.parse({ ruleId: String(args.ruleId) });
      await serviceFromContext(ctx).deleteRule(ctx.userId!, ruleId);
      return true;
    },
  }),
);

builder.mutationField('triggerRule', (t) =>
  t.field({
    type: RuleTriggerResultRef,
    authScopes: { authenticated: true },
    args: { ruleId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const { ruleId } = RuleIdSchema.parse({ ruleId: String(args.ruleId) });
      return serviceFromContext(ctx).triggerRule(ctx.userId!, ruleId);
    },
  }),
);
