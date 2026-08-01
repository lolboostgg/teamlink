"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { randomBookingRequest, type BookingRequestNotification } from "@/lib/dashboard/notifications";

const MAX_HISTORY = 8;

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

// Simulated realtime: no backend to push a real booking event from, so a
// randomized interval generates one while a teammate is looking at their
// dashboard — the same "you got a request, accept or decline it" shape a
// real push notification would have, just client-generated. Capped history
// so it never turns into an unbounded list.
export function NotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isTeammateView = pathname.startsWith("/dashboard/teammate");
  const [notifications, setNotifications] = useState<BookingRequestNotification[]>([]);
  const [seenCount, setSeenCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isTeammateView) return;

    function scheduleNext() {
      const delay = 25000 + Math.random() * 20000;
      timerRef.current = setTimeout(() => {
        setNotifications((prev) => [randomBookingRequest(), ...prev].slice(0, MAX_HISTORY));
        scheduleNext();
      }, delay);
    }
    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTeammateView]);

  const unreadCount = notifications.length - seenCount > 0 ? notifications.length - seenCount : 0;

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAllSeen: () => setSeenCount(notifications.length),
      accept: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: "accepted" } : n))),
      decline: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: "declined" } : n))),
    }),
    [notifications, unreadCount],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
