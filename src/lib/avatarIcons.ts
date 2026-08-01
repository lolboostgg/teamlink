// Deterministic "random" icon + color per person — varied and a bit playful
// instead of plain two-letter initials, but stable across renders for the
// same id/name since there are no real photos for mock teammates/members.
const ICONS = [
  "fa-solid fa-user-astronaut",
  "fa-solid fa-user-ninja",
  "fa-solid fa-user-secret",
  "fa-solid fa-ghost",
  "fa-solid fa-dragon",
  "fa-solid fa-otter",
  "fa-solid fa-dove",
  "fa-solid fa-cat",
  "fa-solid fa-robot",
  "fa-solid fa-crow",
  "fa-solid fa-fire",
  "fa-solid fa-bolt",
  "fa-solid fa-skull",
  "fa-solid fa-paw",
  "fa-solid fa-meteor",
  "fa-solid fa-fish",
];

const COLORS = [
  "var(--accent)",
  "var(--hue-purple)",
  "var(--hue-green)",
  "var(--hue-gold)",
  "var(--hue-pink)",
  "var(--hue-cyan)",
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function pickAvatarIcon(seed: string): { icon: string; color: string } {
  const h = hashSeed(seed);
  return { icon: ICONS[h % ICONS.length], color: COLORS[h % COLORS.length] };
}
