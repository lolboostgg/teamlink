"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useDispatchState } from "@/lib/dispatch/useDispatchState";
import { respondToDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import type { BookingRequestNotification } from "@/lib/dashboard/notifications";

interface NotificationContextValue {
  notifications: BookingRequestNotification[];
  unreadCount: number;
  markAllSeen: () => void;
  accept: (id: string) => void;
  decline: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

// Bell dropdown, sourced from the same real dispatch data as
// the dispatch flow (see lib/dispatch/service.ts) —
// this used to be a randomly-generated fake feed with working-looking
// Accept/Decline buttons that didn't actually do anything, which was
// actively misleading (indistinguishable from a real request). Empty for
// non-teammate accounts, same as before.
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const isTeammate = session?.user?.role === "TEAMMATE";
  const { phase, order, refresh } = useDispatchState();
  // Only ever one open invite now — the server refuses to offer a second
  // order to a teammate who already has one in flight.
  const pendingInvites = phase === "DISPATCH_INCOMING" && order ? [order] : [];
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const notifications: BookingRequestNotification[] = useMemo(() => {
    if (!isTeammate) return [];
    return pendingInvites.map((order) => ({
      id: order.id,
      type: "booking-request" as const,
      status: "pending" as const,
      clientName: order.customerLabel,
      gameName: order.gameName,
      option: order.option,
      priceEUR: order.priceEUR,
      createdAt: Date.now(),
    }));
  }, [isTeammate, phase, order]);

  const unreadCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAllSeen: () => setSeenIds(new Set(notifications.map((n) => n.id))),
      accept: (id) => respondToDispatchAction(id, true).then(refresh),
      decline: (id) => respondToDispatchAction(id, false).then(refresh),
    }),
    [notifications, unreadCount, refresh],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
