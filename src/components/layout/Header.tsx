"use client";

import { Logo } from "@/components/brand/Logo";
import { HeaderAuthButtons } from "@/components/auth/HeaderAuthButtons";
import { HeaderUtilities } from "@/components/layout/HeaderUtilities";
import { useScrolled } from "@/lib/useScrolled";

// Kept compact on purpose: logo and account/dashboard actions. No separate
// nav links — everything lives one click away via Dashboard or the footer.
// Floats fully transparent over the hero art at rest; only gains its
// frosted background/border once the page actually scrolls (see useScrolled).
export function Header() {
  const scrolled = useScrolled();

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="site-header__inner">
        <Logo />

        <div className="site-header__actions">
          <HeaderUtilities />
          <HeaderAuthButtons />
        </div>
      </div>
    </header>
  );
}
