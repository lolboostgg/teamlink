import Link from "next/link";
import type { PublicBlogPost } from "@/lib/blogData";
import { gameIcon } from "@/lib/gameArt";

export function BlogCard({ post, lead = false }: { post: PublicBlogPost; lead?: boolean }) {
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(post.publishedAt);
  return <Link href={`/blog/${post.slug}`} className={`blog-card${lead ? " blog-card--lead" : ""}`}>
    <div className="blog-card__media">{post.coverImageUrl ? <img src={post.coverImageUrl} alt={post.coverImageAlt || ""}/> : post.category.gameSlug ? <img className="blog-card__game" src={gameIcon(post.category.gameSlug)} alt=""/> : <i className="fa-solid fa-newspaper" />}</div>
    <div className="blog-card__body"><div className="blog-card__meta"><span>{post.category.name}</span><time>{date}</time></div><h2>{post.title}</h2><p>{post.excerpt}</p><span className="blog-card__read">Read article <i className="fa-solid fa-arrow-right" /></span></div>
  </Link>;
}
