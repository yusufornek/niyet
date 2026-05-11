import type { GoalTrackingGoalRecord } from './types.js';

export interface ProductSearchResult {
  title: string;
  url: string;
  image: string | null;
  source: string;
  price: number;
  currency: string;
}

export interface ProductSearchProvider {
  searchProducts(query: string): Promise<ProductSearchResult[]>;
  refreshTrackedProductPrice(goal: GoalTrackingGoalRecord): Promise<ProductSearchResult | null>;
}

export type ProductSearchErrorCode =
  | 'MISSING_API_KEY'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'EMPTY_RESULTS'
  | 'PRICE_PARSE_FAILED'
  | 'UPSTREAM_ERROR';

export class ProductSearchError extends Error {
  readonly code: ProductSearchErrorCode;
  readonly cause?: unknown;

  constructor(code: ProductSearchErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ProductSearchError';
    this.code = code;
    this.cause = cause;
  }
}
