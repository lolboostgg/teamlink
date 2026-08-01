import { pickAvatarIcon } from "@/lib/avatarIcons";

interface Props {
  seed: string;
}

// Drop-in replacement for a two-letter initials string inside an existing
// circular avatar wrapper (marquee/teammate-card/chat-list classes already
// provide the circle + fallback background).
export function AvatarIcon({ seed }: Props) {
  const { icon, color } = pickAvatarIcon(seed);
  return <i className={icon} style={{ color }} aria-hidden="true" />;
}
