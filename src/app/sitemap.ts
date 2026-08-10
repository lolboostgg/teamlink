import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { GAMES } from "@/lib/games";
import { POSTS } from "@/lib/blog";
import { LEGAL_SLUGS } from "@/lib/legal";

/**
 * Every page worth indexing, built from the same lists the pages themselves
 * render from — so a game added to lib/games.ts is in the sitemap the moment
 * it is on the site, rather than whenever somebody remembers this file.
 *
 * Nothing behind auth is here; see robots.ts for why those are excluded.
 *
 * `priority` is a hint search engines mostly ignore, but the ordering it
 * encodes is real: the games are what people search for, the legal documents
 * are what nobody does.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/games"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...GAMES.map((game) => ({
      url: absoluteUrl(`/games/${game.slug}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: absoluteUrl("/become-a-teammate"), lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 },
    ...POSTS.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      // The post's own date, not today's: claiming every post changed this
      // morning is how a sitemap stops being believed.
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    ...LEGAL_SLUGS.map((slug) => ({
      url: absoluteUrl(`/legal/${slug}`),
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
