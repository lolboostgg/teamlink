import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { HeaderAuthButtons } from "@/components/auth/HeaderAuthButtons";
import { HeaderUtilities } from "@/components/layout/HeaderUtilities";

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Logo />

        <nav className="site-header__nav" aria-label="Primary">
          <Link href="/games">Games</Link>
          <Link href="/#why-us">Why TeamLink</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>

        <div className="site-header__search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input type="text" placeholder="Search games..." />
        </div>

        <div className="site-header__actions">
          <HeaderUtilities />
          <HeaderAuthButtons />
        </div>
      </div>
    </header>
  );
}
