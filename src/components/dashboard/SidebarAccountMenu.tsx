"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useLiveSync } from "@/lib/events/useLiveSync";
import { PriceTag } from "@/components/currency/PriceTag";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

/**
 * The account control at the foot of the sidebar.
 *
 * It replaces three separate items — a support card, a profile link and a
 * back-to-site link — that were competing for the same corner and each read
 * as the least important thing on the panel. One control, opening upward
 * because it is at the bottom of the screen and a menu that opened downward
 * would fall off it.
 *
 * The balance sits in the closed state rather than inside the menu: it is
 * the number a teammate is actually here for, and burying it behind a click
 * would make it the one thing the panel doesn't say.
 */
export function SidebarAccountMenu({
  name,
  role,
  avatarUrl,
  balanceEUR: initialBalanceEUR,
  profileHref,
  collapsed,
}: {
  name: string;
  role: string;
  avatarUrl: string | null;
  /** Null for an account with no balance of its own, e.g. an admin. */
  balanceEUR: number | null;
  profileHref: string;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Seeded from the layout's server render, then kept current on its own.
  // Finishing an order or being tipped moved this number in the database and
  // nowhere the teammate could see it — the balance was the one thing on the
  // panel that needed a reload to be true.
  const [balanceEUR, setBalanceEUR] = useState(initialBalanceEUR);
  useEffect(() => setBalanceEUR(initialBalanceEUR), [initialBalanceEUR]);

  const hasBalance = initialBalanceEUR !== null;
  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/teammate/balance", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.balanceEUR === "number") setBalanceEUR(data.balanceEUR);
    } catch {
      // Keep the last known figure; the next signal retries.
    }
  }, []);

  // Money moves when an order closes or a tip lands, both of which already
  // announce themselves on this topic. The fallback is slow on purpose —
  // this is a number that changes a few times a day, not a live feed.
  useLiveSync("orders", loadBalance, 120_000, { enabled: hasBalance });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={`sidebar-account${open ? " is-open" : ""}`} ref={wrap}>
      {open && (
        <div className="sidebar-account__menu" role="menu">
          {balanceEUR !== null && (
            <Link href="/dashboard/teammate/payments" className="sidebar-account__balance" role="menuitem">
              <span>Balance</span>
              <strong>
                <PriceTag amountEUR={balanceEUR} />
              </strong>
            </Link>
          )}
          <Link href={profileHref} className="sidebar-account__item" role="menuitem">
            <i className="fa-solid fa-user" aria-hidden="true" />
            My profile
          </Link>
          <Link href="/" transitionTypes={["dashboard-exit"]} className="sidebar-account__item" role="menuitem">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Back to site
          </Link>
          <button
            type="button"
            className="sidebar-account__item sidebar-account__item--danger"
            role="menuitem"
            onClick={() => void signOut({ callbackUrl: "/" })}
          >
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}

      <button
        type="button"
        className="sidebar-account__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? name : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <SafeAvatarImage src={avatarUrl} alt="" className="sidebar-account__avatar" />
        <span className="sidebar-account__who">
          <strong>{name}</strong>
          <span>{balanceEUR !== null ? <PriceTag amountEUR={balanceEUR} /> : role}</span>
        </span>
        <i className="fa-solid fa-chevron-up" aria-hidden="true" />
      </button>
    </div>
  );
}
