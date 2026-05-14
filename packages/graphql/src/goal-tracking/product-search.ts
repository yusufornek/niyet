export interface ProductSearchResult {
  title: string;
  url: string;
  image: string | null;
  source: string;
  price: number;
  currency: string;
}

export interface GoalPriceRefreshCandidate {
  normalizedQuery: string;
  selectedProductTitle: string | null;
  productUrl: string | null;
  productSource: string | null;
}

export type ProductSearchErrorCode =
  | 'MISSING_API_KEY'
  | 'RATE_LIMITED'
  | 'EMPTY_RESULTS'
  | 'PRICE_PARSE_FAILED'
  | 'NETWORK_ERROR'
  | 'UPSTREAM_ERROR';

export class ProductSearchError extends Error {
  readonly code: ProductSearchErrorCode;
  readonly causeValue: unknown;

  constructor(code: ProductSearchErrorCode, message: string, causeValue?: unknown) {
    super(message);
    this.name = 'ProductSearchError';
    this.code = code;
    this.causeValue = causeValue;
  }
}

export interface ProductSearchProvider {
  searchProducts(query: string): Promise<ProductSearchResult[]>;
  refreshTrackedProductPrice(goal: GoalPriceRefreshCandidate): Promise<ProductSearchResult | null>;
}
