"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/dashboard/client", label: "Overview", icon: "fa-solid fa-gauge" },
  { href: "/dashboard/client/orders", label: "Orders", icon: "fa-solid fa-calendar-check" },
  { href: "/dashboard/client/chat", label: "Chat", icon: "fa-solid fa-comments" },
  { href: "/dashboard/client/favorites", label: "Favorites", icon: "fa-solid fa-heart" },
  { href: "/dashboard/client/wallet", label: "Wallet", icon: "fa-solid fa-wallet" },
  { href: "/dashboard/client/settings", label: "Settings", icon: "fa-solid fa-gear" },
];

// Sits right under the real site header instead of a separate dashboard
// shell — this is the client dashboard's only chrome of its own, a plain
// tab strip, so the page still reads as part of teamlink.gg rather than a
// walled-off admin panel.
export function ClientDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="client-dashboard-nav" aria-label="Dashboard sections">
      {SECTIONS.map((s) => {
        const isOverview = s.href === "/dashboard/client";
        const active = isOverview ? pathname === s.href : pathname.startsWith(s.href);
        return (
          <Link key={s.href} href={s.href} className={`client-dashboard-nav__link${active ? " is-active" : ""}`}>
            <i className={s.icon} aria-hidden="true" />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
