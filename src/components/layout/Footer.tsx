import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const FOOTER_NAV = [
  {
    title: "Product",
    links: [
      { label: "Games", href: "/games" },
      { label: "How it works", href: "/how-it-works" },
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

const SOCIALS = [
  { icon: "fa-brands fa-discord", href: "/discord", label: "Discord" },
  { icon: "fa-brands fa-x-twitter", href: "/twitter", label: "X" },
  { icon: "fa-brands fa-instagram", href: "/instagram", label: "Instagram" },
  { icon: "fa-brands fa-tiktok", href: "/tiktok", label: "TikTok" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Logo />
            <p className="site-footer__tagline">Find your next teammate, today.</p>
            <div className="site-footer__social">
              {SOCIALS.map((s) => (
                <a key={s.href} href={s.href} aria-label={s.label}>
                  <i className={s.icon} aria-hidden="true" />
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
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>© {year} TeamLink.gg — All rights reserved.</span>
          <span>Not affiliated with Riot Games, Epic Games, or any game publisher.</span>
        </div>
      </div>
    </footer>
  );
}
