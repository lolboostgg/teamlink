/**
 * Who we are and where to reach us.
 *
 * One copy, because there were two: the transactional mail templates carried
 * the real support address and the real social profiles, while the site footer
 * linked `/discord`, `/twitter`, `/instagram` and `/tiktok` — internal paths
 * that have never existed. Every social icon on the site 404'd while the same
 * links in the email footer worked. Anything user-facing that needs to name
 * the company or point at it should read it from here.
 */
export const COMPANY = {
  legalName: "LB Gaming Services LTD",
  address: "71-75 Shelton Street, London, United Kingdom",
  site: "https://gaming.lolboost.gg",
  discord: "https://discord.gg/lolboost",
  support: "support@lolboost.gg",
  /** Public review profile. Still under the lolboost.gg name — that is the
   *  domain the reviews were left on, and moving a Trustpilot profile loses
   *  them, so the link says lolboost.gg and means it. */
  trustpilot: "https://www.trustpilot.com/review/lolboost.gg",
};

/**
 * What the Trustpilot profile says.
 *
 * Typed in, not read: Trustpilot has no free API for this and blocks scraping,
 * so these two numbers are a claim we publish about a page anybody can open
 * from the same badge. That makes them checkable — and it makes them ours to
 * keep true. If the profile moves, these move with it.
 *
 * Distinct from the on-site rating in lib/community.ts, which counts the
 * ratings left inside the product. The two are different populations and the
 * badge says which one it is showing.
 */
export const TRUSTPILOT = {
  score: 4.9,
  /** Rounded down and written as "1,000+", never as an exact count we cannot verify. */
  reviews: "1,000+",
};

export interface SocialLink {
  label: string;
  url: string;
  /** Names the mark rather than picking one: the site draws it as a
   *  FontAwesome glyph, the mail templates as public/email/social/<key>.png,
   *  because an icon font cannot survive a mail client. */
  key: "discord" | "x" | "instagram" | "tiktok";
}

export const SOCIALS: SocialLink[] = [
  { label: "Discord", url: COMPANY.discord, key: "discord" },
  { label: "X", url: "https://x.com/lolboostgg", key: "x" },
  { label: "Instagram", url: "https://instagram.com/lolboost.gg", key: "instagram" },
  { label: "TikTok", url: "https://tiktok.com/@lolboost.gg", key: "tiktok" },
];

export const SOCIAL_GLYPHS: Record<SocialLink["key"], string> = {
  discord: "fa-brands fa-discord",
  x: "fa-brands fa-x-twitter",
  instagram: "fa-brands fa-instagram",
  tiktok: "fa-brands fa-tiktok",
};

/** `mailto:` for support, with the subject already filled in where we know
 *  what the person was looking at — an order number in the subject line is the
 *  difference between an answer today and three round trips. */
export function supportMailto(subject?: string): string {
  return `mailto:${COMPANY.support}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
