"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { usePoll } from "@/lib/usePoll";

type Listener = (key: string | undefined) => void;

interface Signal {
  topic: string;
  key?: string;
}

// One EventSource for the whole tab, shared by every hook instance. Opening
// one per live view would burn through the browser's per-origin connection
// limit with nothing to show for it — the stream carries all topics anyway.
let source: EventSource | null = null;
let refCount = 0;
const listeners = new Map<string, Set<Listener>>();

// Connection state is a tiny external store rather than a plain flag, so a
// stream that drops actually re-renders the hooks and speeds their fallback
// polling back up. A plain variable would leave them stuck on the slow
// interval exactly when the stream stopped delivering.
let connected = false;
const connectionWatchers = new Set<() => void>();

function setConnected(next: boolean) {
  if (connected === next) return;
  connected = next;
  connectionWatchers.forEach((notify) => notify());
}

function subscribeToConnection(notify: () => void) {
  connectionWatchers.add(notify);
  return () => connectionWatchers.delete(notify);
}

function openStream() {
  if (source || typeof window === "undefined") return;
  source = new EventSource("/api/events");
  source.addEventListener("open", () => setConnected(true));
  source.addEventListener("error", () => {
    // EventSource reconnects on its own; flip the flag so the polling
    // fallback speeds back up while we're disconnected.
    setConnected(false);
  });
  source.addEventListener("change", (event) => {
    try {
      const signal = JSON.parse((event as MessageEvent).data) as Signal;
      listeners.get(signal.topic)?.forEach((listener) => listener(signal.key));
    } catch {
      // Ignore a malformed frame rather than killing the stream.
    }
  });
}

function closeStream() {
  source?.close();
  source = null;
  setConnected(false);
}

/**
 * How often to poll anyway, as a safety net behind the stream.
 *
 * A stream reporting "open" only means the browser's HTTP connection to
 * `/api/events` succeeded — it says nothing about whether server→server
 * delivery (Postgres LISTEN/NOTIFY across instances) is actually working.
 * When it silently isn't, this is what keeps chat and dashboards from going
 * up to a full minute of silence between two people on different instances,
 * so it stays close to the disconnected interval rather than far above it.
 */
const CONNECTED_FALLBACK_MS = 4_000;

/**
 * Keeps a view in sync with the server.
 *
 * The stream is the primary path: when something changes, `refresh` runs
 * immediately instead of on the next tick. Polling stays as a fallback —
 * slowed to once a minute while the stream is up, back to `fallbackMs` when
 * it isn't — so a blocked or proxied-away SSE connection degrades to the old
 * behaviour instead of a dashboard that silently stops updating.
 *
 * `key` scopes a topic (a conversation key for chat); when set, only signals
 * carrying the same key trigger a refresh.
 */
export function useLiveSync(
  topic: string,
  refresh: () => void | Promise<unknown>,
  fallbackMs: number,
  options: { enabled?: boolean; key?: string } = {},
) {
  const { enabled = true, key } = options;
  const refreshRef = useRef(refresh);
  // Kept in an effect rather than assigned during render: a render can be
  // thrown away or replayed, and writing to a ref in that phase is exactly
  // what React's rules forbid.
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!enabled) return;

    refCount += 1;
    openStream();

    const listener: Listener = (signalKey) => {
      if (key !== undefined && signalKey !== undefined && signalKey !== key) return;
      void refreshRef.current();
    };
    const set = listeners.get(topic) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(topic, set);

    return () => {
      set.delete(listener);
      if (set.size === 0) listeners.delete(topic);
      refCount -= 1;
      if (refCount === 0) closeStream();
    };
  }, [topic, key, enabled]);

  const isConnected = useSyncExternalStore(
    subscribeToConnection,
    () => connected,
    // The server renders no stream, so assume disconnected there.
    () => false,
  );

  const task = useCallback(() => refreshRef.current(), []);
  usePoll(task, isConnected ? CONNECTED_FALLBACK_MS : fallbackMs, enabled);
}
