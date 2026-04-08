"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { supabaseClient } from "@/lib/supabase-client";

type ConnectionStatus = "connecting" | "connected" | "error";

interface RealtimeContextValue {
  /** Global connection status */
  status: ConnectionStatus;
  /** Trigger a manual refresh (useful when reconnecting after disconnect) */
  lastReconnect: number;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "connecting",
  lastReconnect: 0,
});

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

/**
 * Wraps the app to monitor the global Supabase Realtime connection.
 * Individual subscriptions are managed per-component via useRealtimeSubscription.
 * This provider tracks overall connectivity and exposes a reconnect timestamp
 * so pages can do a full data refresh after recovering from a disconnect.
 */
export default function RealtimeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastReconnect, setLastReconnect] = useState(0);
  const wasDisconnected = useRef(false);

  const checkConnection = useCallback(() => {
    const channels = supabaseClient.getChannels();
    if (channels.length === 0) {
      setStatus("connecting");
      return;
    }
    // If any channel is subscribed, we're connected
    const anySubscribed = channels.some(
      (ch) => (ch as any).state === "joined", // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    if (anySubscribed) {
      if (wasDisconnected.current) {
        wasDisconnected.current = false;
        setLastReconnect(Date.now());
      }
      setStatus("connected");
    } else {
      const anyErrored = channels.some(
        (ch) => (ch as any).state === "errored", // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      if (anyErrored) {
        wasDisconnected.current = true;
        setStatus("error");
      } else {
        setStatus("connecting");
      }
    }
  }, []);

  useEffect(() => {
    // Poll connection status every 5s (lightweight — just checks channel state)
    const interval = setInterval(checkConnection, 5_000);
    checkConnection();
    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <RealtimeContext.Provider value={{ status, lastReconnect }}>
      {children}
    </RealtimeContext.Provider>
  );
}
