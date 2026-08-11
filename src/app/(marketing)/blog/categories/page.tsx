import type { Metadata } from "next";
import Link from "next/link";
import { getBlogCategories } from "@/lib/blogData";
import { gameIcon } from "@/lib/gameArt";
import { getServerLanguage } from "@/lib/serverLanguage";
import { translatePhrase } from "@/lib/phrases";

export const metadata: Metadata = { title: "Blog categories", description: "Browse QUP.gg gaming articles by game." };
export const dynamic = "force-dynamic";

export default async function BlogCategoriesPage() {
  const categories = await getBlogCategories();
  const language = await getServerLanguage(); const p = (phrase: string) => translatePhrase(language, phrase);
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  return <main className="blog-page section"><div className="container">
    <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link href="/blog">{p("Gaming blog")}</Link><i className="fa-solid fa-chevron-right"/><span>{p("Categories")}</span></nav>
    <header className="blog-category-hero"><span className="section__eyebrow">{p("Game categories")}</span><h1>{p("Find guides for your game.")}</h1><p>{p("Every article belongs to a game or the general QUP.gg category. Pick what you actually want to read.")}</p><Link href="/blog" className="btn btn--outline"><i className="fa-solid fa-arrow-left"/> {p("All articles")} ({total})</Link></header>
    <div className="blog-category-grid">{categories.map(category => <Link href={`/blog/categories/${category.slug}`} className="blog-category-card" key={category.slug}>
      <div className="blog-category-card__head"><span className="blog-category-card__icon">{category.gameSlug ? <img src={gameIcon(category.gameSlug)} alt=""/> : <i className="fa-solid fa-newspaper"/>}</span><h2>{category.name}</h2><span className="status-pill">{category.count} articles</span></div>
      <p>{category.description || `Guides, news and tips for ${category.name}.`}</p><span className="blog-card__read">{p("View articles")} <i className="fa-solid fa-arrow-right"/></span>
    </Link>)}</div>
  </div></main>;
}
