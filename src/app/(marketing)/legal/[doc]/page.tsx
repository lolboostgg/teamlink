import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/marketing/PageHero";
import { LEGAL_DOCS, LEGAL_SLUGS, getLegalDoc } from "@/lib/legal";
import { COMPANY, supportMailto } from "@/lib/company";
import { pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ doc: string }>;
}

// One route for all three documents (see lib/legal.ts) — they have the same
// shape, so three copies of this file would only be three chances to fix a
// heading style in two of them.
export function generateStaticParams() {
  return LEGAL_SLUGS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  const legal = getLegalDoc(doc);
  if (!legal) return {};
  return pageMetadata({ title: legal.title, description: legal.description, path: `/legal/${legal.slug}` });
}

export default async function LegalPage({ params }: Props) {
  const { doc } = await params;
  const legal = getLegalDoc(doc);
  if (!legal) notFound();

  return (
    <main className="section">
      <div className="container container--narrow">
        <PageHero eyebrow="Legal" title={legal.title} sub={legal.description}>
          <p className="page-hero__meta">Last updated {legal.updated}</p>
        </PageHero>

        {/* The other two are always one click away: nobody reads a refund
            policy without wanting to check the terms it refers to. */}
        <nav className="legal-switch" aria-label="Legal documents">
          {Object.values(LEGAL_DOCS).map((other) => (
            <Link
              key={other.slug}
              href={`/legal/${other.slug}`}
              className={`legal-switch__link${other.slug === legal.slug ? " is-active" : ""}`}
            >
              {other.title}
            </Link>
          ))}
        </nav>

        <article className="prose">
          {legal.intro.map((paragraph) => (
            <p className="prose__lead" key={paragraph}>
              {paragraph}
            </p>
          ))}

          {legal.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.list && (
                <ul>
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section>
            <h2>Contact</h2>
            <p>
              {COMPANY.legalName}, {COMPANY.address}. Questions about this document go to{" "}
              <a href={supportMailto(legal.title)}>{COMPANY.support}</a>, or through the{" "}
              <Link href="/contact">contact page</Link>.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
