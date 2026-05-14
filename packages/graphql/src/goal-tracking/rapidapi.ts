import { parsePrice } from '@niyet/core';

import type {
  GoalPriceRefreshCandidate,
  ProductSearchProvider,
  ProductSearchResult,
} from './product-search';
import { ProductSearchError } from './product-search';

const REQUEST_TIMEOUT_MS = 30000;
const RETRY_BACKOFF_MS = [500, 1500] as const;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

interface RapidApiProductSearchProviderOptions {
  apiKey?: string;
  host?: string;
  fetchImpl?: typeof fetch;
  country?: string;
  language?: string;
}

type UnknownRecord = Record<string, unknown>;

export class RapidApiProductSearchProvider implements ProductSearchProvider {
  private readonly apiKey: string | undefined;
  private readonly host: string;
  private readonly fetchImpl: typeof fetch;
  private readonly country: string;
  private readonly language: string;

  constructor(options: RapidApiProductSearchProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.RAPIDAPI_KEY;
    this.host =
      options.host ?? process.env.RAPIDAPI_HOST ?? 'real-time-product-search.p.rapidapi.com';
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.country = options.country ?? 'tr';
    this.language = options.language ?? 'tr';
  }

  async searchProducts(query: string): Promise<ProductSearchResult[]> {
    if (!this.apiKey) {
      throw new ProductSearchError('MISSING_API_KEY', 'RapidAPI key is not configured.');
    }

    const url = new URL(`https://${this.host}/search-v2`);
    url.searchParams.set('q', query);
    url.searchParams.set('country', this.country);
    url.searchParams.set('language', this.language);

    const response = await this.fetchWithRetry(url);

    if (response.status === 429) {
      throw new ProductSearchError('RATE_LIMITED', 'RapidAPI rate limit exceeded.');
    }

    if (!response.ok) {
      throw new ProductSearchError('UPSTREAM_ERROR', `RapidAPI returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as unknown;
    const results = extractResults(payload)
      .map(normalizeProductResult)
      .filter((result): result is ProductSearchResult => result !== null);

    if (results.length === 0) {
      throw new ProductSearchError('EMPTY_RESULTS', 'RapidAPI returned no product results.');
    }

    return results;
  }

  async refreshTrackedProductPrice(
    goal: GoalPriceRefreshCandidate,
  ): Promise<ProductSearchResult | null> {
    const products = await this.searchProducts(goal.normalizedQuery);
    return (
      matchByUrl(products, goal.productUrl) ??
      matchByTitle(products, goal.selectedProductTitle) ??
      matchBySource(products, goal.productSource) ??
      null
    );
  }

  // search-v2 can take 20s+ for broad queries such as iPhone; keep timeout
  // above observed upstream latency and retry only transient failures.
  // Wraps fetch with a bounded timeout and retries for transient errors
  // (network failures, 502/503/504). Permanent failures (429, 4xx, 5xx other
  // than retryable) propagate immediately. NETWORK_ERROR is only thrown after
  // all retries are exhausted.
  private async fetchWithRetry(url: URL): Promise<Response> {
    const maxAttempts = 1 + RETRY_BACKOFF_MS.length;
    let lastNetworkError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await sleep(RETRY_BACKOFF_MS[attempt - 1] ?? 0);
      }

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          headers: {
            'x-rapidapi-host': this.host,
            'x-rapidapi-key': this.apiKey ?? '',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        lastNetworkError = error;
        continue;
      }

      // Retry on transient upstream errors; otherwise hand the response back
      // and let the caller classify it (429, 4xx, success, etc.).
      if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts - 1) {
        continue;
      }

      return response;
    }

    throw new ProductSearchError(
      'NETWORK_ERROR',
      `RapidAPI product search failed after ${maxAttempts} attempts.`,
      lastNetworkError,
    );
  }
}

function extractResults(payload: unknown): UnknownRecord[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as UnknownRecord;
  const candidates = [record.data, record.products, record.results, record.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
    if (isRecord(candidate)) {
      const nested = [candidate.products, candidate.results, candidate.items];
      const nestedArray = nested.find(Array.isArray);
      if (Array.isArray(nestedArray)) {
        return nestedArray.filter(isRecord);
      }
    }
  }

  return [];
}

function normalizeProductResult(item: UnknownRecord): ProductSearchResult | null {
  // /search-v2 response shape:
  //   product: { product_title, product_page_url, product_photos[], typical_price_range[],
  //              offer: { offer_title, offer_page_url, price, store_name, ... } | null }
  // /search (legacy, removed upstream) used a flatter shape; we keep its keys here for
  // forward-compat in case the provider partially restores them.
  const offer = isRecord(item.offer) ? item.offer : null;
  const photos = Array.isArray(item.product_photos) ? item.product_photos : [];
  const priceRange = Array.isArray(item.typical_price_range) ? item.typical_price_range : [];

  const title =
    stringFrom(offer?.offer_title) ??
    stringFrom(item.product_title) ??
    stringFrom(item.title) ??
    stringFrom(item.name);

  // url and image are rendered as href/src in the UI — must be http(s) only.
  // safeHttpUrl rejects javascript:, data:, vbscript:, file:, etc.
  // Prefer offer_page_url (direct merchant link) over product_page_url (Google Shopping).
  const url =
    safeHttpUrl(offer?.offer_page_url) ??
    safeHttpUrl(item.product_page_url) ??
    safeHttpUrl(item.url) ??
    safeHttpUrl(item.link) ??
    safeHttpUrl(item.product_url);

  const image =
    safeHttpUrl(photos[0]) ??
    safeHttpUrl(item.image) ??
    safeHttpUrl(item.thumbnail) ??
    safeHttpUrl(item.product_image);

  const source =
    stringFrom(offer?.store_name) ??
    stringFrom(item.source) ??
    stringFrom(item.store) ??
    stringFrom(item.merchant) ??
    hostnameFromUrl(url);

  // /search-v2 prices are localized strings ("₺46.999,00"); parsePrice handles them.
  // typical_price_range gives a low-end fallback when no offer is attached.
  const rawPrice =
    offer?.price ??
    priceRange[0] ??
    item.price ??
    item.extracted_price ??
    item.offer_price ??
    item.product_price ??
    item.price_text;
  const parsedPrice = parsePrice(
    typeof rawPrice === 'number' || typeof rawPrice === 'string' ? rawPrice : null,
  );

  if (!title || !url || !source || !parsedPrice) {
    return null;
  }

  return {
    title,
    url,
    image,
    source,
    price: parsedPrice.amount,
    currency: parsedPrice.currency,
  };
}

function matchByUrl(
  products: ProductSearchResult[],
  productUrl: string | null,
): ProductSearchResult | null {
  if (!productUrl) {
    return null;
  }

  return products.find((product) => normalizeUrl(product.url) === normalizeUrl(productUrl)) ?? null;
}

function matchByTitle(
  products: ProductSearchResult[],
  selectedProductTitle: string | null,
): ProductSearchResult | null {
  if (!selectedProductTitle) {
    return null;
  }

  const normalizedTarget = normalizeComparableText(selectedProductTitle);
  return (
    products
      .map((product) => ({
        product,
        similarity: titleSimilarity(normalizeComparableText(product.title), normalizedTarget),
      }))
      .sort((left, right) => right.similarity - left.similarity)
      .find((candidate) => candidate.similarity >= 0.5)?.product ?? null
  );
}

function matchBySource(
  products: ProductSearchResult[],
  productSource: string | null,
): ProductSearchResult | null {
  if (!productSource) {
    return null;
  }

  const normalizedSource = normalizeComparableText(productSource);
  return (
    products.find(
      (product) =>
        normalizeComparableText(product.source) === normalizedSource && product.price > 0,
    ) ?? null
  );
}

function titleSimilarity(left: string, right: string): number {
  const leftTerms = new Set(left.split(' ').filter(Boolean));
  const rightTerms = new Set(right.split(' ').filter(Boolean));
  if (leftTerms.size === 0 || rightTerms.size === 0) {
    return 0;
  }

  const intersection = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  const union = new Set([...leftTerms, ...rightTerms]).size;
  return intersection / union;
}

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}

function hostnameFromUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function stringFrom(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// Accepts only http(s) URLs. Rejects javascript:, data:, vbscript:, file:, etc.
// Returned URLs are safe to render as href/src in the UI.
function safeHttpUrl(value: unknown): string | null {
  const raw = stringFrom(value);
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
