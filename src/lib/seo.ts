import type { Metadata } from "next";
import { COMPANY, SOCIALS } from "@/lib/company";

/**
 * One place that knows the site's own address, and what to tell a crawler.
 *
 * The canonical URL matters more here than on most sites: the app answers on
 * gaming.lolboost.gg today and is meant to answer on qup.gg later, and a page
 * reachable at two hostnames without a canonical is two pages competing with
 * each other for the same query. Every indexable page declares one.
 *
 * APP_URL wins where it is set, for the same reason metadataBase reads it in
 * app/layout.tsx: the deployment knows its own name, this file does not.
 */
export const SITE_URL = (process.env.APP_URL ?? process.env.AUTH_URL ?? COMPANY.site).replace(/\/$/, "");

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Metadata for one indexable page. Spreading this rather than hand-writing
 * `alternates` per page is what keeps a new page from quietly shipping
 * without a canonical.
 */
export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  /** Overrides for the social card, where the page wants its own. */
  openGraph?: Metadata["openGraph"];
}): Metadata {
  const url = absoluteUrl(input.path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: input.title,
      description: input.description,
      ...input.openGraph,
    },
  };
}

/**
 * JSON-LD, rendered by components/seo/StructuredData.tsx.
 *
 * Kept as plain builders rather than a library: the shapes below are the four
 * Google actually reads anything into for a marketplace, and each is a dozen
 * lines. `@id` is spelled out so the graph nodes can reference each other
 * instead of repeating the organisation on every page.
 */
export const ORGANISATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function organisationSchema() {
  return {
    "@type": "Organization",
    "@id": ORGANISATION_ID,
    name: "QUP.gg",
    legalName: COMPANY.legalName,
    url: SITE_URL,
    logo: absoluteUrl("/brand/qup-logo.png"),
    email: COMPANY.support,
    sameAs: [...SOCIALS.map((s) => s.url), COMPANY.trustpilot],
    address: {
      "@type": "PostalAddress",
      streetAddress: "71-75 Shelton Street",
      addressLocality: "London",
      addressCountry: "GB",
    },
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: "QUP.gg",
    publisher: { "@id": ORGANISATION_ID },
  };
}

/** One bookable game. `offers` carries the real entry price for that game. */
export function gameServiceSchema(input: {
  name: string;
  slug: string;
  description: string;
  priceFromEUR: number | null;
  image: string;
}) {
  return {
    "@type": "Service",
    "@id": `${absoluteUrl(`/games/${input.slug}`)}#service`,
    name: `${input.name} teammates`,
    serviceType: "Online gaming teammate",
    description: input.description,
    url: absoluteUrl(`/games/${input.slug}`),
    image: absoluteUrl(input.image),
    provider: { "@id": ORGANISATION_ID },
    areaServed: "Worldwide",
    ...(input.priceFromEUR !== null
      ? {
          offers: {
            "@type": "Offer",
            price: input.priceFromEUR.toFixed(2),
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/games/${input.slug}`),
          },
        }
      : {}),
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function blogPostingSchema(input: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
}) {
  return {
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(`/blog/${input.slug}`),
    mainEntityOfPage: absoluteUrl(`/blog/${input.slug}`),
    datePublished: input.datePublished,
    dateModified: input.datePublished,
    author: { "@id": ORGANISATION_ID },
    publisher: { "@id": ORGANISATION_ID },
  };
}
