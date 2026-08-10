import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCard } from "@/components/blog/BlogCard";
import { getBlogCategories, getPublishedPosts } from "@/lib/blogData";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const category = (await getBlogCategories()).find(item => item.slug === slug); return category ? { title: `${category.name} guides`, description: category.description || `Guides and news for ${category.name}.` } : {}; }

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params; const categories = await getBlogCategories(); const category = categories.find(item => item.slug === slug); if (!category) notFound();
  const posts = await getPublishedPosts(slug);
  return <main className="blog-page section"><div className="container">
    <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link href="/blog">Gaming blog</Link><i className="fa-solid fa-chevron-right"/><Link href="/blog/categories">Categories</Link><i className="fa-solid fa-chevron-right"/><span>{category.name}</span></nav>
    <header className="blog-category-hero"><span className="section__eyebrow">{category.name}</span><h1>{category.name} guides and news.</h1><p>{category.description || `Everything QUP.gg publishes about ${category.name}.`}</p></header>
    {posts.length ? <div className="blog-grid">{posts.map(post => <BlogCard key={post.slug} post={post}/>)}</div> : <div className="empty-state">No published articles in this category yet.</div>}
  </div></main>;
}
