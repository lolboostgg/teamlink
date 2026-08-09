import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: string;
  sub?: string;
  /** Dateline, reading time, a CTA row — whatever the page needs under the copy. */
  children?: ReactNode;
}

// The masthead every content page opens with (about, blog, contact, legal).
// One component so they cannot drift apart a heading size at a time — the
// homepage sections stay on .section__head, which this deliberately mirrors
// rather than replaces.
export function PageHero({ eyebrow, title, sub, children }: Props) {
  return (
    <header className="page-hero">
      <div className="page-hero__eyebrow">{eyebrow}</div>
      <h1 className="page-hero__title">{title}</h1>
      {sub && <p className="page-hero__sub">{sub}</p>}
      {children}
    </header>
  );
}
