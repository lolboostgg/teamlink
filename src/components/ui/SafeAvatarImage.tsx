"use client";

export function SafeAvatarImage({ src, alt = "", className }: { src?: string | null; alt?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src || "/avatars/default.webp"} alt={alt} onError={(event) => {
    if (!event.currentTarget.src.endsWith("/avatars/default.webp")) event.currentTarget.src = "/avatars/default.webp";
  }} />;
}
