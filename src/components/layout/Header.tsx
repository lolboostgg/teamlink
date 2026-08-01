import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Logo />

        <nav className="site-header__nav" aria-label="Primary">
          <Link href="/games">Games</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#why-us">Why TeamLink</Link>
        </nav>

        <div className="site-header__search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input type="text" placeholder="Search games..." />
        </div>

        <div className="site-header__actions">
          <Link className="btn btn--ghost btn--sm" href="/login">
            Log in
          </Link>
          <Link className="btn btn--primary btn--sm" href="/signup">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
