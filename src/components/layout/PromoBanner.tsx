"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "teamlink:promo-dismissed";

// Evergreen, honest promo strip — a flat high-contrast color band for
// visual pop against the dark starfield theme (tapin.gg leans on a bright
// banner in the same spot). Deliberately no fake countdown/urgency: the
// referral offer is always-on, not a manufactured expiring "sale."
export function PromoBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  return (
    <div className="promo-banner">
      <div className="container promo-banner__inner">
        <span className="promo-banner__badge">
          <i className="fa-solid fa-gift" aria-hidden="true" />
        </span>
        <p className="promo-banner__text">
          <strong>Refer a friend</strong> and you both get €5 session credit.
        </p>
        <Link href="/games" className="promo-banner__cta">
          Learn more <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </Link>
        <button type="button" className="promo-banner__close" onClick={dismiss} aria-label="Dismiss">
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
