import { Logo } from "@/components/brand/Logo";
import { HeaderAuthButtons } from "@/components/auth/HeaderAuthButtons";
import { HeaderUtilities } from "@/components/layout/HeaderUtilities";
import { HeaderSearch } from "@/components/layout/HeaderSearch";

// Kept compact on purpose: logo, a live game search, and account/dashboard
// actions. No separate nav links — the search covers "find a game" and
// everything else lives one click away via Dashboard or the footer.
// Always-frosted (blur + background) rather than transparent-until-scroll —
// the hero underneath is full-viewport key art now, so the header needs to
// stay readable over it immediately, not just after scrolling.
export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Logo />
        <HeaderSearch />

        <div className="site-header__actions">
          <HeaderUtilities />
          <HeaderAuthButtons />
        </div>
      </div>
    </header>
  );
}
