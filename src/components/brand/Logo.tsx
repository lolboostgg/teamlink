import Link from "next/link";

// Placeholder mark — two overlapping rounded shapes standing in for "two
// players linked up." Swap for a real brand mark later; kept deliberately
// simple/flat (no gradients) to match the rest of the design system.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--accent)" />
      <circle cx="13" cy="16" r="6" fill="var(--bg)" fillOpacity="0.92" />
      <circle cx="20" cy="16" r="6" fill="var(--bg)" fillOpacity="0.55" />
    </svg>
  );
}

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link href="/" className="logo">
      <LogoMark />
      {withWordmark && <span className="logo__word">TeamLink</span>}
    </Link>
  );
}
