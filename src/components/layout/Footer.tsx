import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PAYMENT_ICONS } from "@/lib/payments";
import { SOCIALS, SOCIAL_GLYPHS, supportMailto } from "@/lib/company";

const FOOTER_NAV = [
  {
    title: "Product",
    links: [
      { label: "Games", href: "/games" },
      // The section exists, on the landing page (see home/HowItWorks.tsx) —
      // only the standalone page it pointed at never did.
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/games" },
      { label: "Become a Teammate", href: "/become-a-teammate" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      // The one link in this column that goes somewhere today. A "Contact"
      // that 404s is worse than no contact link at all — the people who click
      // it are the ones who already have a problem.
      { label: "Contact", href: supportMailto("QUP.gg support") },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Refund Policy", href: "/legal/refunds" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Logo />
            <p className="site-footer__tagline">Ready. Queue. Play.</p>
            <div className="site-footer__social">
              {SOCIALS.map((s) => (
                <a key={s.url} href={s.url} aria-label={s.label} target="_blank" rel="noreferrer noopener">
                  <i className={SOCIAL_GLYPHS[s.key]} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="site-footer__nav">
            {FOOTER_NAV.map((col) => (
              <div className="site-footer__col" key={col.title}>
                <div className="site-footer__col-title">{col.title}</div>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      {link.href.startsWith("mailto:") ? (
                        <a href={link.href}>{link.label}</a>
                      ) : (
                        /* prefetch={false}: most of these routes don't exist
                           yet, and the footer sits in the viewport on every
                           page — Next prefetched all of them on sight, so
                           each load fired a burst of 404s. */
                        <Link href={link.href} prefetch={false}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer__payments">
          {PAYMENT_ICONS.map((icon) => (
            <i key={icon} className={icon} aria-hidden="true" />
          ))}
        </div>

        <div className="site-footer__bottom">
          <span>© {year} QUP.gg. All rights reserved.</span>
          <span>Not affiliated with Riot Games, Epic Games, or any game publisher.</span>
        </div>
      </div>
    </footer>
  );
}
