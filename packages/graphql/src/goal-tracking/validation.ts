import { z } from 'zod';

export const NormalizeGoalProductQueryInputSchema = z.object({
  rawQuery: z.string().trim().min(2).max(160),
});

export const SearchGoalProductsInputSchema = z.object({
  query: z.string().trim().min(2).max(160),
});

export const CreateGoalTrackingInputSchema = z.object({
  rawQuery: z.string().trim().min(2).max(160),
  normalizedQuery: z.string().trim().min(2).max(160),
  category: z.string().trim().max(60).nullable().optional(),
  selectedProductTitle: z.string().trim().min(2).max(240),
  productUrl: z.string().url().max(1000),
  productImage: z.string().url().max(1000).nullable().optional(),
  productSource: z.string().trim().min(1).max(120),
  price: z.number().positive(),
  currency: z.string().trim().min(3).max(3).default('TRY'),
});

export const GoalIdInputSchema = z.object({
  goalId: z.string().min(1),
});

export const AlertIdInputSchema = z.object({
  alertId: z.string().min(1),
});

export type CreateGoalTrackingInput = z.infer<typeof CreateGoalTrackingInputSchema>;
