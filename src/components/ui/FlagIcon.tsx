// Real flag SVGs instead of emoji flags — emoji regional-indicator flags
// don't render as flags on Windows (no glyphs in Segoe UI Emoji), they just
// show the raw two-letter code as text. This is a same-origin asset so it
// always renders consistently.
export function FlagIcon({ iso, label, className }: { iso: string; label?: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${iso}.svg`}
      alt=""
      title={label}
      className={`flag-icon${className ? ` ${className}` : ""}`}
      loading="lazy"
    />
  );
}
