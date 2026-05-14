/**
 * GraphQL client — graphql-request + TanStack Query.
 * Same-origin /api/graphql endpoint'ine istek atar.
 */
import { GraphQLClient } from 'graphql-request';

import { env } from '@/lib/env';

const endpoint = `${env.NEXT_PUBLIC_APP_URL}/api/graphql`;

export const gqlClient = new GraphQLClient(endpoint, {
  credentials: 'same-origin',
});

/** TanStack Query'de kullanılacak generic fetcher */
export async function gqlFetcher<TData, TVariables extends Record<string, unknown> | undefined>(
  query: string,
  variables?: TVariables,
): Promise<TData> {
  try {
    return await gqlClient.request<TData>(query, variables as Record<string, unknown> | undefined);
  } catch (error) {
    throw new Error(extractGraphqlErrorMessage(error));
  }
}

function extractGraphqlErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Beklenmeyen bir hata olustu.';
  }

  const response = 'response' in error ? error.response : null;
  if (!response || typeof response !== 'object') {
    return 'Beklenmeyen bir hata olustu.';
  }

  const errors = 'errors' in response ? response.errors : null;
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Beklenmeyen bir hata olustu.';
  }

  const firstError = errors[0];
  if (!firstError || typeof firstError !== 'object') {
    return 'Beklenmeyen bir hata olustu.';
  }

  const extensions = 'extensions' in firstError ? firstError.extensions : null;
  if (extensions && typeof extensions === 'object') {
    const originalError = 'originalError' in extensions ? extensions.originalError : null;
    if (originalError && typeof originalError === 'object') {
      const originalMessage = 'message' in originalError ? originalError.message : null;
      if (typeof originalMessage === 'string' && originalMessage.trim()) {
        return originalMessage.trim();
      }
    }
  }

  const message = 'message' in firstError ? firstError.message : null;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  return 'Beklenmeyen bir hata olustu.';
}
