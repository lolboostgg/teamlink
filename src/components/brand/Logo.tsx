import Link from "next/link";

/** What to call us in text — one copy, so a rename is one edit. */
export const BRAND_NAME = "QUP.gg";

/**
 * The mark on its own, for anywhere too narrow for the full lockup — the
 * collapsed dashboard sidebar being the one that exists today.
 */
export function LogoMark({ size = 34 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/qup-mark.png" width={size} height={size} alt="" className="logo__mark" />;
}

/**
 * The supplied artwork rather than the hand-drawn SVG that stood in for it:
 * the neon depth in the real mark is not something a handful of paths gets to,
 * and the wordmark ships as part of the same image so the two can never drift
 * out of alignment.
 *
 * Plain <img> on purpose — 15 KB of PNG that every page draws once, already
 * near its render size, so next/image would add an optimizer round-trip per
 * request for a few kilobytes. Width and height are the intrinsic pixels, and
 * CSS sizes it: without them the header reflows once the image lands.
 */
export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label={`${BRAND_NAME} — home`}>
      {withWordmark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/qup-logo.png" width={355} height={128} alt={BRAND_NAME} className="logo__lockup" />
      ) : (
        <LogoMark />
      )}
    </Link>
  );
}
