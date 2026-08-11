import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { BlogCard } from "@/components/blog/BlogCard";
import { getPublishedPosts } from "@/lib/blogData";
import { pageMetadata } from "@/lib/seo";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { getServerLanguage } from "@/lib/serverLanguage";
import { translatePhrase } from "@/lib/phrases";

export const metadata: Metadata = pageMetadata({ title: "Gaming Blog", description: "Guides, news and practical tips for the games you play.", path: "/blog" });
export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;
export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const posts = await getPublishedPosts();
  const language = await getServerLanguage(); const p = (phrase: string) => translatePhrase(language, phrase);
  const requested = Number((await searchParams).page ?? 1); const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE)); const page = Math.min(Math.max(1, Number.isFinite(requested) ? requested : 1), pages);
  const visible = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return <main className="blog-page section"><div className="container">
    <PageHero eyebrow="QUP.gg Blog" title={p("Guides, updates and better games.")} sub={p("Short, practical reads about the games you play, the teammates you meet and how QUP.gg works behind the scenes.")} />
    <div className="blog-toolbar"><Link href="/blog/categories" className="btn btn--outline"><i className="fa-solid fa-layer-group" /> {p("Browse game categories")}</Link></div>
    <div className="blog-list-heading"><div><span className="section__eyebrow">{p("Latest")}</span><h2>{p("Latest articles")}</h2></div><span>{posts.length} {p("articles")}</span></div>
    {visible.length ? <div className="blog-grid">{visible.map(post => <BlogCard key={post.slug} post={post}/>)}</div> : <div className="empty-state">{p("No published articles yet.")}</div>}
    <BlogPagination page={page} pages={pages} basePath="/blog"/>
  </div></main>;
}
