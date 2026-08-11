import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublishedPost } from "@/lib/blogData";
import { getPost } from "@/lib/blog";
import { absoluteUrl, blogPostingSchema } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";
import { getServerLanguage } from "@/lib/serverLanguage";
import { translatePhrase } from "@/lib/phrases";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const post = await getPublishedPost(slug); if (!post) return {};
  const url = absoluteUrl(`/blog/${post.slug}`); const title = post.seoTitle || post.title; const description = post.seoDescription || post.excerpt;
  return { title, description, alternates: { canonical: url }, openGraph: { type: "article", url, title, description, publishedTime: post.publishedAt.toISOString(), images: post.coverImageUrl ? [post.coverImageUrl] : undefined } };
}

const headingId = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function DatabaseArticle({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).filter(Boolean);
  return <>{blocks.map((block, index) => {
    if (block.startsWith("## ")) { const heading = block.slice(3); return <h2 id={headingId(heading)} key={index}>{heading}</h2>; }
    if (block.split("\n").every(line => line.startsWith("- "))) return <ul key={index}>{block.split("\n").map(line => <li key={line}>{line.slice(2)}</li>)}</ul>;
    return <p key={index}>{block}</p>;
  })}</>;
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params; const post = await getPublishedPost(slug); if (!post) notFound(); const legacy = getPost(slug);
  const language = await getServerLanguage(); const p = (phrase: string) => translatePhrase(language, phrase);
  const date = new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric" }).format(post.publishedAt);
  const headings = legacy ? legacy.body.flatMap(section => section.heading ? [section.heading] : []) : (post.content || "").split("\n").filter(line => line.startsWith("## ")).map(line => line.slice(3));
  return <main className="blog-page blog-article-page section"><div className="blog-article-shell">
    <aside className="blog-article-adrail blog-article-adrail--left" aria-label="QUP.gg">
      <Link href="/games" className="blog-article-adrail__sticky">
        <Image src="/blog/blog-side-left.png" alt="Ready. Queue. Team Up." width={944} height={1668} priority />
      </Link>
    </aside>
    <div className="container container--narrow blog-article-content">
    <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link href="/blog">{p("Gaming blog")}</Link><i className="fa-solid fa-chevron-right"/><Link href="/blog/categories">{p("Categories")}</Link><i className="fa-solid fa-chevron-right"/><Link href={`/blog/categories/${post.category.slug}`}>{post.category.name}</Link><i className="fa-solid fa-chevron-right"/><span>{post.title}</span></nav>
    <header className="blog-article-head"><div className="post-card__meta"><span className="post-card__tag">{post.category.name}</span><time>{date}</time></div><h1>{post.title}</h1><p>{post.excerpt}</p></header>
    {post.coverImageUrl && <figure className="blog-article-cover"><img src={post.coverImageUrl} alt={post.coverImageAlt || ""}/></figure>}
    <StructuredData schemas={[blogPostingSchema({ title: post.title, description: post.excerpt, slug: post.slug, datePublished: post.publishedAt.toISOString() })]}/>
    <div className="blog-article-layout"><article className="prose blog-article-prose">{legacy ? legacy.body.map((section, i) => <section key={section.heading ?? i}>{section.heading && <h2 id={headingId(section.heading)}>{section.heading}</h2>}{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.list && <ul>{section.list.map(item => <li key={item}>{item}</li>)}</ul>}</section>) : <DatabaseArticle content={post.content || ""}/>}</article>
      <aside className="blog-article-sidebar"><div className="blog-article-sidebar__card"><span>{p("In this article")}</span>{headings.length ? <nav>{headings.map(heading => <a href={`#${headingId(heading)}`} key={heading}>{heading}</a>)}</nav> : <p>{p("A short read from QUP.gg.")}</p>}<Link href={`/blog/categories/${post.category.slug}`}>{p("More in")} {post.category.name} <i className="fa-solid fa-arrow-right"/></Link></div></aside>
    </div>
    <div className="blog-article-back"><Link href={`/blog/categories/${post.category.slug}`} className="btn btn--outline"><i className="fa-solid fa-arrow-left"/> More {post.category.name} articles</Link></div>
    </div>
    <aside className="blog-article-adrail blog-article-adrail--right" aria-label="QUP.gg">
      <Link href="/games" className="blog-article-adrail__sticky">
        <Image src="/blog/blog-side-right.png" alt="Buy. Wait. Team Up." width={944} height={1668} priority />
      </Link>
    </aside>
  </div></main>;
}
