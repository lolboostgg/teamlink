import Link from "next/link";
import { getServerLanguage } from "@/lib/serverLanguage";
import { translatePhrase } from "@/lib/phrases";

export async function BlogPagination({ page, pages, basePath }: { page: number; pages: number; basePath: string }) {
  if (pages <= 1) return null;
  const language = await getServerLanguage(); const p = (phrase: string) => translatePhrase(language, phrase);
  const href = (next: number) => next === 1 ? basePath : `${basePath}?page=${next}`;
  return <nav className="blog-pagination" aria-label="Article pages">
    {page > 1 && <Link href={href(page - 1)} className="btn btn--outline btn--sm"><i className="fa-solid fa-arrow-left"/> {p("Previous")}</Link>}
    <span>{p("Page")} {page} {p("of")} {pages}</span>
    {page < pages && <Link href={href(page + 1)} className="btn btn--outline btn--sm">{p("Next")} <i className="fa-solid fa-arrow-right"/></Link>}
  </nav>;
}
