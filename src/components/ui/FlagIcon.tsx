import { Tooltip } from "@/components/ui/Tooltip";

// Real flag SVGs instead of emoji flags — emoji regional-indicator flags
// don't render as flags on Windows (no glyphs in Segoe UI Emoji), they just
// show the raw two-letter code as text. This is a same-origin asset so it
// always renders consistently.
export function FlagIcon({ iso, label, className }: { iso: string; label?: string; className?: string }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/flags/${iso}.svg`} alt={label ?? ""} className={`flag-icon${className ? ` ${className}` : ""}`} loading="lazy" />
  );

  if (!label) return img;

  return <Tooltip label={label}>{img}</Tooltip>;
}
