import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PAYMENT_ICONS } from "@/lib/payments";
import { SOCIALS, SOCIAL_GLYPHS } from "@/lib/company";
import { TrustpilotBadge } from "@/components/ui/TrustpilotBadge";

// Every entry here now resolves to a real page. That is the rule for this
// list: a footer link is a promise the site keeps, and "Pricing" pointing at
// the games grid was the last one that did not — pricing lives on each game's
// booking panel, so the honest link is the one already above it.
const FOOTER_NAV = [
  {
    title: "Product",
    links: [
      { label: "Games", href: "/games" },
      // The section exists, on the landing page (see home/HowItWorks.tsx) —
      // only the standalone page it pointed at never did.
      { label: "How it works", href: "/#how-it-works" },
      { label: "Become a Teammate", href: "/become-a-teammate" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
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
                      {/* prefetch={false}: the footer is in the viewport on
                          every page, so the default would prefetch ten
                          low-intent routes on every single load. The cost of
                          not doing it is one navigation nobody notices. */}
                      <Link href={link.href} prefetch={false}>
                        {link.label}
                      </Link>
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

        <div className="site-footer__proof">
          <TrustpilotBadge />
        </div>

        <div className="site-footer__bottom">
          <span>© {year} QUP.gg. All rights reserved.</span>
          <span>Not affiliated with Riot Games, Epic Games, or any game publisher.</span>
        </div>
      </div>
    </footer>
  );
}
