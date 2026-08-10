import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * What a crawler may look at.
 *
 * The disallowed paths are all behind auth already — this is not a security
 * measure and must never be mistaken for one. It exists so a crawler spends
 * its budget on the pages that can rank, and so a signed-out crawl of
 * /dashboard/* does not fill the index with login redirects.
 *
 * /api is disallowed for the same reason: nothing under it is a page, and
 * every hit is a Node request that cannot be cached.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/checkout/", "/order/", "/join/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
