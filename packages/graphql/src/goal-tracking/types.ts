export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type AlertDirection = 'INCREASE' | 'DECREASE';

export interface GoalTrackingGoalRecord {
  id: string;
  userId: string;
  goalName: string;
  rawQuery: string;
  normalizedQuery: string;
  category: string | null;
  selectedProductTitle: string;
  productUrl: string;
  productImage: string | null;
  productSource: string;
  originalPrice: unknown;
  currentPrice: unknown;
  currency: string;
  savedAmount: unknown;
  targetDate: Date;
  lastCheckedAt: Date | null;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalPriceAlertRecord {
  id: string;
  goalId: string;
  oldPrice: unknown;
  newPrice: unknown;
  percentageChange: unknown;
  direction: AlertDirection;
  remainingAmountImpact: unknown;
  monthlySavingNeeded: unknown;
  readAt: Date | null;
  createdAt: Date;
  goal?: GoalTrackingGoalRecord;
}

export interface GoalTrackingRepository {
  goalTrackingGoal: {
    findMany(args: unknown): Promise<GoalTrackingGoalRecord[]>;
    findFirst(args: unknown): Promise<GoalTrackingGoalRecord | null>;
    create(args: unknown): Promise<GoalTrackingGoalRecord>;
    update(args: unknown): Promise<GoalTrackingGoalRecord>;
  };
  goalPriceHistory: {
    create(args: unknown): Promise<unknown>;
  };
  goalPriceAlert: {
    findMany(args: unknown): Promise<GoalPriceAlertRecord[]>;
    findFirst(args: unknown): Promise<GoalPriceAlertRecord | null>;
    create(args: unknown): Promise<GoalPriceAlertRecord>;
    update(args: unknown): Promise<GoalPriceAlertRecord>;
  };
}

export function moneyToNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    return Number.parseFloat((value as { toString: () => string }).toString());
  }

  return 0;
}
