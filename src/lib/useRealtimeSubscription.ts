"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type ConnectionStatus = "connecting" | "connected" | "error";
export type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface SubscriptionConfig {
  table: string;
  schema?: string;
  event?: ChangeEvent;
  filter?: string; // e.g. "store_id=eq.abc123"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (payload: RealtimePostgresChangesPayload<any>) => void;
}

interface UseRealtimeOptions {
  /** Unique channel name — defaults to table name */
  channelName?: string;
  /** Whether the subscription is enabled (default true) */
  enabled?: boolean;
}

const MAX_BACKOFF = 30_000;

export function useRealtimeSubscription(
  subscriptions: SubscriptionConfig[],
  options: UseRealtimeOptions = {},
) {
  const { channelName, enabled = true } = options;
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);
  const backoffRef = useRef(1_000);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a stable ref to the latest callbacks so we never have stale closures
  const subsRef = useRef(subscriptions);
  subsRef.current = subscriptions;

  const subscribe = useCallback(() => {
    // Clean up any existing channel
    if (channelRef.current) {
      supabaseClient.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const name = channelName || subscriptions.map((s) => s.table).join("-");
    let channel = supabaseClient.channel(`realtime:${name}`);

    for (const sub of subsRef.current) {
      const params: Record<string, string> = {
        event: sub.event || "*",
        schema: sub.schema || "public",
        table: sub.table,
      };
      if (sub.filter) params.filter = sub.filter;

      channel = channel.on(
        "postgres_changes" as "postgres_changes",
        params as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        (payload: RealtimePostgresChangesPayload<any>) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (!mountedRef.current) return;
          // Find matching subscription and call its callback
          const matching = subsRef.current.find(
            (s) => s.table === payload.table && (s.event === "*" || s.event === payload.eventType || !s.event),
          );
          if (matching) matching.callback(payload);
        },
      );
    }

    channel.subscribe((status) => {
      if (!mountedRef.current) return;

      if (status === "SUBSCRIBED") {
        setStatus("connected");
        backoffRef.current = 1_000; // reset backoff on success
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setStatus("error");
        // Exponential backoff reconnect
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) subscribe();
        }, delay);
      }
    });

    channelRef.current = channel;
  }, [channelName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || subscriptions.length === 0) {
      setStatus("connecting");
      return;
    }

    subscribe();

    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, subscribe]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status };
}
