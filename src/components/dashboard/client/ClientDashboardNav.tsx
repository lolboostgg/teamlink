"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language/LanguageProvider";
import type { TranslationKey } from "@/lib/translations";

const SECTIONS = [
  { href: "/dashboard/client", key: "nav.overview", icon: "fa-solid fa-gauge" },
  { href: "/dashboard/client/orders", key: "nav.orders", icon: "fa-solid fa-calendar-check" },
  { href: "/dashboard/client/favorites", key: "nav.favorites", icon: "fa-solid fa-heart" },
  { href: "/dashboard/client/wallet", key: "nav.wallet", icon: "fa-solid fa-wallet" },
  { href: "/dashboard/client/disputes", key: "nav.support", icon: "fa-solid fa-life-ring" },
  { href: "/dashboard/client/settings", key: "nav.settings", icon: "fa-solid fa-gear" },
] satisfies { href: string; key: TranslationKey; icon: string }[];

// Sits right under the real site header instead of a separate dashboard
// shell — this is the client dashboard's only chrome of its own, a plain
// tab strip, so the page still reads as part of qup.gg rather than a
// walled-off admin panel.
export function ClientDashboardNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="client-dashboard-nav" aria-label="Dashboard sections">
      {SECTIONS.map((s) => {
        const isOverview = s.href === "/dashboard/client";
        const active = isOverview ? pathname === s.href : pathname.startsWith(s.href);
        return (
          // scroll={false}: the default jump to the top is what made
          // switching tabs feel like leaving the page.
          <Link
            key={s.href}
            href={s.href}
            scroll={false}
            className={`client-dashboard-nav__link${active ? " is-active" : ""}`}
          >
            <i className={s.icon} aria-hidden="true" />
            {t(s.key)}
          </Link>
        );
      })}
    </nav>
  );
}
