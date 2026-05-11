'use client';

/**
 * RealtimeBootstrap — root layout'ta render edilir.
 *
 * Niyet'in demo akışında authenticated user "Ayşe". Real auth gelince
 * Supabase getUser() ile alınır. Şimdilik GraphQL `me` query'sinden userId
 * çekilip realtime kanalları subscribe edilir.
 */
import { useQuery } from '@tanstack/react-query';

import { useRealtimeAnalysis, useRealtimeNotifications } from '@/lib/realtime/use-notifications';
import { gqlFetcher } from '@/lib/graphql/client';

interface MeResponse {
  me: { id: string } | null;
}

export function RealtimeBootstrap() {
  const { data } = useQuery<MeResponse>({
    queryKey: ['me-id'],
    queryFn: () => gqlFetcher<MeResponse, undefined>(`query { me { id } }`),
    staleTime: 60_000,
  });

  const userId = data?.me?.id ?? null;
  useRealtimeNotifications(userId);
  useRealtimeAnalysis(userId);

  return null;
}
