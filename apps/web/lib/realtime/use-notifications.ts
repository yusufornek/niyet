/**
 * Niyet Realtime — Supabase postgres_changes subscription'ı.
 *
 * Notification tablosuna INSERT geldiğinde:
 *  1. Sonner toast göster
 *  2. TanStack Query cache invalidate et (notifications listesi yenilensin)
 *
 * Hook her zaman aktif (global layout'tan çağrılır). User authentic değilse
 * sessizce no-op.
 */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';

interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  payload?: unknown;
  createdAt: string;
}

export function useRealtimeNotifications(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationPayload;
          // Toast tipine göre renk
          const variant = row.type === 'AI_INSIGHT' ? 'info' : 'success';
          toast[variant === 'info' ? 'info' : 'success'](row.title, {
            description: row.body,
            duration: 6000,
          });
          // İlgili query'leri invalidate et
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * AnalysisRun tablosuna INSERT geldiğinde dashboard'u tazele.
 * Ayrıca özel "Analiz tamamlandı" UX'i (loading state biten).
 */
export function useRealtimeAnalysis(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`analysis:user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'AnalysisRun',
          filter: `userId=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['analysisHistory'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
