import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCard } from "@/components/blog/BlogCard";
import { getBlogCategories, getPublishedPosts } from "@/lib/blogData";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { getServerLanguage } from "@/lib/serverLanguage";
import { translatePhrase } from "@/lib/phrases";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const category = (await getBlogCategories()).find(item => item.slug === slug); return category ? { title: `${category.name} guides`, description: category.description || `Guides and news for ${category.name}.` } : {}; }

const PAGE_SIZE = 9;
export default async function BlogCategoryPage({ params, searchParams }: Props & { searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params; const categories = await getBlogCategories(); const category = categories.find(item => item.slug === slug); if (!category) notFound();
  const posts = await getPublishedPosts(slug);
  const language = await getServerLanguage(); const p = (phrase: string) => translatePhrase(language, phrase);
  const requested = Number((await searchParams).page ?? 1); const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE)); const page = Math.min(Math.max(1, Number.isFinite(requested) ? requested : 1), pages); const visible = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return <main className="blog-page section"><div className="container">
    <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link href="/blog">{p("Gaming blog")}</Link><i className="fa-solid fa-chevron-right"/><Link href="/blog/categories">{p("Categories")}</Link><i className="fa-solid fa-chevron-right"/><span>{category.name}</span></nav>
    <header className="blog-category-hero"><span className="section__eyebrow">{category.name}</span><h1>{category.name} guides and news.</h1><p>{category.description || `Everything QUP.gg publishes about ${category.name}.`}</p></header>
    <div className="blog-list-heading"><div><span className="section__eyebrow">{p("Latest")}</span><h2>{p("Latest")} {category.name}</h2></div><span>{posts.length} {p("articles")}</span></div>
    {visible.length ? <div className="blog-grid">{visible.map(post => <BlogCard key={post.slug} post={post}/>)}</div> : <div className="empty-state">{p("No published articles in this category yet.")}</div>}
    <BlogPagination page={page} pages={pages} basePath={`/blog/categories/${slug}`}/>
  </div></main>;
}
