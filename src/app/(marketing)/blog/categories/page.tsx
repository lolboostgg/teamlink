import type { Metadata } from "next";
import Link from "next/link";
import { getBlogCategories } from "@/lib/blogData";
import { gameIcon } from "@/lib/gameArt";

export const metadata: Metadata = { title: "Blog categories", description: "Browse QUP.gg gaming articles by game." };
export const dynamic = "force-dynamic";

export default async function BlogCategoriesPage() {
  const categories = await getBlogCategories();
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  return <main className="blog-page section"><div className="container">
    <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link href="/blog">Gaming blog</Link><i className="fa-solid fa-chevron-right"/><span>Categories</span></nav>
    <header className="blog-category-hero"><span className="section__eyebrow">Game categories</span><h1>Find guides for your game.</h1><p>Every article belongs to a game or the general QUP.gg category. Pick what you actually want to read.</p><Link href="/blog" className="btn btn--outline"><i className="fa-solid fa-arrow-left"/> All articles ({total})</Link></header>
    <div className="blog-category-grid">{categories.map(category => <Link href={`/blog/categories/${category.slug}`} className="blog-category-card" key={category.slug}>
      <div className="blog-category-card__head"><span className="blog-category-card__icon">{category.gameSlug ? <img src={gameIcon(category.gameSlug)} alt=""/> : <i className="fa-solid fa-newspaper"/>}</span><h2>{category.name}</h2><span className="status-pill">{category.count} articles</span></div>
      <p>{category.description || `Guides, news and tips for ${category.name}.`}</p><span className="blog-card__read">View articles <i className="fa-solid fa-arrow-right"/></span>
    </Link>)}</div>
  </div></main>;
}
