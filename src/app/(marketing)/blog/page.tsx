import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { POSTS, formatPostDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "How the platform works, how to play better, and what we are changing.",
};

export default function BlogIndexPage() {
  const [lead, ...rest] = POSTS;

  return (
    <main className="section">
      <div className="container">
        <PageHero
          eyebrow="Blog"
          title="Notes from the queue"
          sub="How the matching actually works, what makes a session good, and the decisions behind the product. No press releases."
        />

        {/* The newest post gets the wide card. A grid of identical tiles makes
            every post look equally urgent, which is how a blog reads as an
            archive instead of something with a current issue. */}
        <Reveal>
          <Link href={`/blog/${lead.slug}`} className="post-card post-card--lead">
            <div className="post-card__meta">
              <span className="post-card__tag">{lead.tag}</span>
              <span>{formatPostDate(lead.date)}</span>
              <span>{lead.readMinutes} min read</span>
            </div>
            <h2 className="post-card__title">{lead.title}</h2>
            <p className="post-card__excerpt">{lead.excerpt}</p>
            <span className="post-card__more">
              Read it <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </span>
          </Link>
        </Reveal>

        <div className="post-grid">
          {rest.map((post, i) => (
            <Reveal key={post.slug} delay={i * 70}>
              <Link href={`/blog/${post.slug}`} className="post-card">
                <div className="post-card__meta">
                  <span className="post-card__tag">{post.tag}</span>
                  <span>{formatPostDate(post.date)}</span>
                  <span>{post.readMinutes} min read</span>
                </div>
                <h2 className="post-card__title">{post.title}</h2>
                <p className="post-card__excerpt">{post.excerpt}</p>
                <span className="post-card__more">
                  Read it <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
