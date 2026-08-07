"use client";

import { usePathname } from "next/navigation";

/**
 * Each tab is its own route, so switching one swapped the content hard and
 * the page jumped between a short tab (Favorites) and a long one (Orders) —
 * which reads as a navigation rather than a tab change.
 *
 * Keying on the pathname replays the transition on every switch, and the
 * floor keeps the page from collapsing under a short tab.
 */
export function ClientDashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="client-dashboard__content">
      {children}
    </div>
  );
}
