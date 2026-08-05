"use client";

import { avatarFrameStyle, type AvatarFrame } from "@/lib/avatarFrame";

export function SafeAvatarImage({
  src,
  alt = "",
  className,
  // Whoever the picture belongs to, when their framing is known — the same
  // focal point the teammate set in their profile editor, so a face they
  // placed in the roster card doesn't sit half outside the round avatar.
  frame,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  frame?: AvatarFrame | null;
}) {
  // A previous upload path stored a truncated data URL (roughly 2 KB). Browsers
  // cannot decode it, so do not even hand known-bad legacy values to the image.
  const safeSrc = src?.startsWith("data:image/") && src.length <= 2_000 ? null : src;

  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} style={frame ? avatarFrameStyle(frame) : undefined} src={safeSrc || "/avatars/default.webp"} alt={alt} onError={(event) => {
    if (!event.currentTarget.src.endsWith("/avatars/default.webp")) event.currentTarget.src = "/avatars/default.webp";
  }} />;
}
