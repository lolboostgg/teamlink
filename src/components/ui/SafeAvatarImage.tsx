"use client";

export function SafeAvatarImage({ src, alt = "", className }: { src?: string | null; alt?: string; className?: string }) {
  // A previous upload path stored a truncated data URL (roughly 2 KB). Browsers
  // cannot decode it, so do not even hand known-bad legacy values to the image.
  const safeSrc = src?.startsWith("data:image/") && src.length <= 2_000 ? null : src;

  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={safeSrc || "/avatars/default.webp"} alt={alt} onError={(event) => {
    if (!event.currentTarget.src.endsWith("/avatars/default.webp")) event.currentTarget.src = "/avatars/default.webp";
  }} />;
}
