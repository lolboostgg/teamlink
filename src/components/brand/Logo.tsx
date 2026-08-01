import Link from "next/link";

// Hexagon mark with two interlocking "link" shapes in a cyan→purple
// gradient, per the reference logo the user provided. This is the one
// deliberate, sanctioned use of a gradient in the whole design system — a
// brand mark is exactly where that's expected, unlike buttons/text/cards.
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tlLogoGradient" x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        d="M24 2.5 44 14v20L24 45.5 4 34V14z"
        fill="#0b0f1a"
        stroke="url(#tlLogoGradient)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M27 15.5c-4.5 0-8 3.6-8 8v1"
        stroke="#22d3ee"
        strokeWidth="4.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M21 32.5c4.5 0 8-3.6 8-8v-1"
        stroke="#a855f7"
        strokeWidth="4.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link href="/" className="logo">
      <LogoMark />
      {withWordmark && (
        <span className="logo__word">
          TeamLink<span className="logo__word-accent">.GG</span>
        </span>
      )}
    </Link>
  );
}
