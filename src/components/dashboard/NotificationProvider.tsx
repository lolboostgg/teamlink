"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useDispatchState } from "@/lib/dispatch/useDispatchState";
import { respondToDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { playSound, type SoundName } from "@/lib/notificationSound";
import { useToast } from "@/components/ui/ToastProvider";
import { useLiveSync } from "@/lib/events/useLiveSync";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const teammateDashboardActive = session?.user?.role === "TEAMMATE" || pathname.startsWith("/dashboard/teammate");
  const { phase, order, refresh, fetchedAt } = useDispatchState(teammateDashboardActive);
  const [stored, setStored] = useState<FeedNotification[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  // Which notification has already had its sound, and whether the feed has
  // settled after the first read. Refs, not state: nothing on screen depends
  // on them, and as state they only caused a second render per poll.
  const announcedRef = useRef<string | null>(null);
  const adoptedRef = useRef(false);

  const load = useCallback(async () => {
    if (!signedIn) return;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStored(data.notifications ?? []);
      setLoaded(true);
    } catch {
      // A dropped poll is not worth surfacing; the next tick retries.
    }
  }, [signedIn]);

  useLiveSync("notifications", load, 8000, { enabled: signedIn });

  // Different events, different cues — the bell is the one place every
  // notification type passes through, so it is where the mapping belongs.
  function soundForType(type: string): SoundName {
    if (type === "tip.received") return "tip";
    if (type.startsWith("order.unread")) return "message";
    if (type === "order.cancel_requested") return "cancel";
    if (type === "dispatch.incoming") return "request";
    // A new ticket is somebody stuck and waiting on a person. It gets the
    // same cue as a cancellation on purpose — both are "an admin has to look
    // at this", and neither should sound like a routine bell row.
    if (type === "dispute.opened") return "cancel";
    // A reply on a ticket is somebody talking to you, which is what the
    // message cue already means everywhere else in the app.
    if (type === "dispute.replied") return "message";
    if (type === "dispute.resolved") return "tip";
    return "generic";
  }

  // A newly arrived unread notification gets one sound, not one per poll.
  //
  // The backlog waiting at sign-in is adopted silently — nobody wants a burst
  // of chimes for things that happened yesterday. That used to be keyed on the
  // first notification ever seen, which meant an account arriving with an empty
  // feed swallowed the sound of its *first real* notification too; it is keyed
  // on the first completed read now, so only the backlog is quiet.
  useEffect(() => {
    if (!loaded) return;
    const newest = stored.find((n) => !n.read);
    if (!adoptedRef.current) {
      adoptedRef.current = true;
      announcedRef.current = newest?.id ?? null;
      return;
    }
    if (!newest || announcedRef.current === newest.id) return;
    announcedRef.current = newest.id;
    playSound(soundForType(newest.type));
    if (newest.type === "order.completed") showToast(newest.body || newest.title, "success");
  }, [stored, loaded, showToast]);

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
              // The read that surfaced this invite, rather than a clock read
              // during render. An invite lives for seconds, so "as of the last
              // poll" is as good as exact and doesn't drift on every re-render.
              createdAt: fetchedAt,
              actionable: true,
            },
          ]
        : [];
    return [...invite, ...stored];
  }, [phase, order, stored, fetchedAt]);

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
    // `unreadCount` also depends on `seenIds`, which nothing else here does:
    // leaving it out froze the bell's badge on the count from the last time
    // `notifications` changed, so dismissing one didn't clear it.
    [notifications, unreadCount, refresh, load],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
