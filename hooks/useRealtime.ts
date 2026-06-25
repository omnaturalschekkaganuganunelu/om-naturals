import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useRealtime(
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: (payload: any) => void
) {
  const savedCallback = useRef(callback);
  const channelId = useRef(Math.random().toString(36).substring(7)).current;

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create a unique channel name for this hook instance to avoid conflicts
    const channel = supabase
      .channel(`public-${table}-changes-${channelId}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        (payload) => {
          savedCallback.current(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, channelId]);
}
