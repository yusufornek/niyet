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
  return gqlClient.request<TData>(query, variables as Record<string, unknown> | undefined);
}
