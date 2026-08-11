import Link from "next/link";
import type { PublicBlogPost } from "@/lib/blogData";
import { gameIcon } from "@/lib/gameArt";
import { getServerLanguage } from "@/lib/serverLanguage";
import { translatePhrase } from "@/lib/phrases";

export async function BlogCard({ post, lead = false }: { post: PublicBlogPost; lead?: boolean }) {
  const language = await getServerLanguage(); const p = (phrase: string) => translatePhrase(language, phrase);
  const date = new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric" }).format(post.publishedAt);
  return <Link href={`/blog/${post.slug}`} className={`blog-card${lead ? " blog-card--lead" : ""}`}>
    <div className="blog-card__media">{post.coverImageUrl ? <img src={post.coverImageUrl} alt={post.coverImageAlt || ""}/> : post.category.gameSlug ? <img className="blog-card__game" src={gameIcon(post.category.gameSlug)} alt=""/> : <i className="fa-solid fa-newspaper" />}</div>
    <div className="blog-card__body"><div className="blog-card__meta"><span>{post.category.name}</span><time>{date}</time></div><h2>{post.title}</h2><p>{post.excerpt}</p><span className="blog-card__read">{p("Read article")} <i className="fa-solid fa-arrow-right" /></span></div>
  </Link>;
}
