import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, getPost, formatPostDate } from "@/lib/blog";
import { StructuredData } from "@/components/seo/StructuredData";
import { absoluteUrl, blogPostingSchema } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: post.title, description: post.excerpt, publishedTime: post.date },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Whatever is next in the list, wrapping at the end — a post with nothing
  // under it is a dead end, and this file is the last thing anybody reads.
  const index = POSTS.findIndex((p) => p.slug === post.slug);
  const next = POSTS[(index + 1) % POSTS.length];

  return (
    <main className="section">
      <div className="container container--narrow">
        <Link href="/blog" className="back-link">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> All posts
        </Link>

        <header className="page-hero page-hero--left">
          <div className="post-card__meta">
            <span className="post-card__tag">{post.tag}</span>
            <span>{formatPostDate(post.date)}</span>
            <span>{post.readMinutes} min read</span>
          </div>
          <h1 className="page-hero__title">{post.title}</h1>
          <p className="page-hero__sub">{post.excerpt}</p>
        </header>

        <StructuredData
          schemas={[
            blogPostingSchema({
              title: post.title,
              description: post.excerpt,
              slug: post.slug,
              datePublished: post.date,
            }),
          ]}
        />

        <article className="prose">
          {post.body.map((section, i) => (
            <section key={section.heading ?? i}>
              {section.heading && <h2>{section.heading}</h2>}
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
        </article>

        <aside className="post-next">
          <span className="post-next__label">Read next</span>
          <Link href={`/blog/${next.slug}`} className="post-next__link">
            {next.title}
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </main>
  );
}
