"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useDispatchState } from "@/lib/dispatch/useDispatchState";
import { respondToDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { playNotificationSound } from "@/lib/notificationSound";
import { useToast } from "@/components/ui/ToastProvider";

export interface FeedNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: number;
  /** A live dispatch invite the bell can answer inline. */
  actionable?: boolean;
}

interface NotificationContextValue {
  notifications: FeedNotification[];
  unreadCount: number;
  markAllSeen: () => void;
  markSeen: (id: string) => void;
  accept: (id: string) => void;
  decline: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

/**
 * The bell feed: stored notifications from the server (verification
 * submitted/decided, order assigned, order completed) merged with the one
 * live dispatch invite, which stays actionable inline. Polled — the same
 * trade-off as the dispatch state, and honest about its latency.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user?.id);
  const { phase, order, refresh } = useDispatchState(session?.user?.role === "TEAMMATE");
  const [stored, setStored] = useState<FeedNotification[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [announced, setAnnounced] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStored(data.notifications ?? []);
    } catch {
      // A dropped poll is not worth surfacing; the next tick retries.
    }
  }, [signedIn]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  // A newly arrived unread notification gets one sound, not one per poll.
  useEffect(() => {
    const newest = stored.find((n) => !n.read);
    if (!newest || announced === newest.id) return;
    if (announced !== null) {
      playNotificationSound();
      if (newest.type === "order.completed") showToast(newest.body || newest.title, "success");
    }
    setAnnounced(newest.id);
  }, [stored, announced, showToast]);

  const notifications: FeedNotification[] = useMemo(() => {
    const invite: FeedNotification[] =
      phase === "DISPATCH_INCOMING" && order
        ? [
            {
              id: order.id,
              type: "dispatch.incoming",
              title: `New request · ${order.gameName}`,
              body: `${order.customerLabel} · ${order.option}`,
              href: null,
              read: false,
              createdAt: Date.now(),
              actionable: true,
            },
          ]
        : [];
    return [...invite, ...stored];
  }, [phase, order, stored]);

  const unreadCount = notifications.filter((n) => !n.read && !seenIds.has(n.id)).length;

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAllSeen: () => {
        setSeenIds(new Set(notifications.map((n) => n.id)));
        setStored((current) => current.map((item) => ({ ...item, read: true })));
        fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(load);
      },
      markSeen: (id) => {
        setSeenIds((current) => new Set([...current, id]));
        setStored((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
        fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).then(load);
      },
      accept: (id) => respondToDispatchAction(id, true).then(refresh),
      decline: (id) => respondToDispatchAction(id, false).then(refresh),
    }),
    [notifications, refresh, load],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
