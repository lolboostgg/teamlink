import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { BlogCard } from "@/components/blog/BlogCard";
import { getPublishedPosts } from "@/lib/blogData";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Gaming Blog", description: "Guides, news and practical tips for the games you play.", path: "/blog" });
export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();
  const [lead, ...rest] = posts;
  return <main className="blog-page section"><div className="container">
    <PageHero eyebrow="QUP.gg Blog" title="Guides for better games." sub="Useful guides, game updates and honest notes from the people building QUP.gg." />
    <div className="blog-toolbar"><Link href="/blog/categories" className="btn btn--outline"><i className="fa-solid fa-layer-group" /> Browse game categories</Link></div>
    {lead ? <><BlogCard post={lead} lead/><div className="blog-grid">{rest.map(post => <BlogCard key={post.slug} post={post}/>)}</div></> : <div className="empty-state">No published articles yet.</div>}
  </div></main>;
}
