import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPost } from "@/lib/blogData";
import { getPost } from "@/lib/blog";
import { absoluteUrl, blogPostingSchema } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const post = await getPublishedPost(slug); if (!post) return {};
  const url = absoluteUrl(`/blog/${post.slug}`); const title = post.seoTitle || post.title; const description = post.seoDescription || post.excerpt;
  return { title, description, alternates: { canonical: url }, openGraph: { type: "article", url, title, description, publishedTime: post.publishedAt.toISOString(), images: post.coverImageUrl ? [post.coverImageUrl] : undefined } };
}

function DatabaseArticle({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).filter(Boolean);
  return <>{blocks.map((block, index) => {
    if (block.startsWith("## ")) return <h2 key={index}>{block.slice(3)}</h2>;
    if (block.split("\n").every(line => line.startsWith("- "))) return <ul key={index}>{block.split("\n").map(line => <li key={line}>{line.slice(2)}</li>)}</ul>;
    return <p key={index}>{block}</p>;
  })}</>;
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params; const post = await getPublishedPost(slug); if (!post) notFound(); const legacy = getPost(slug);
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(post.publishedAt);
  return <main className="blog-page section"><div className="container container--narrow">
    <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link href="/blog">Gaming blog</Link><i className="fa-solid fa-chevron-right"/><Link href="/blog/categories">Categories</Link><i className="fa-solid fa-chevron-right"/><Link href={`/blog/categories/${post.category.slug}`}>{post.category.name}</Link><i className="fa-solid fa-chevron-right"/><span>{post.title}</span></nav>
    <header className="blog-article-head"><div className="post-card__meta"><span className="post-card__tag">{post.category.name}</span><time>{date}</time></div><h1>{post.title}</h1><p>{post.excerpt}</p></header>
    {post.coverImageUrl && <figure className="blog-article-cover"><img src={post.coverImageUrl} alt={post.coverImageAlt || ""}/></figure>}
    <StructuredData schemas={[blogPostingSchema({ title: post.title, description: post.excerpt, slug: post.slug, datePublished: post.publishedAt.toISOString() })]}/>
    <article className="prose blog-article-prose">{legacy ? legacy.body.map((section, i) => <section key={section.heading ?? i}>{section.heading && <h2>{section.heading}</h2>}{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.list && <ul>{section.list.map(item => <li key={item}>{item}</li>)}</ul>}</section>) : <DatabaseArticle content={post.content || ""}/>}</article>
    <div className="blog-article-back"><Link href={`/blog/categories/${post.category.slug}`} className="btn btn--outline"><i className="fa-solid fa-arrow-left"/> More {post.category.name} articles</Link></div>
  </div></main>;
}
