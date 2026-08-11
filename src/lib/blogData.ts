import "server-only";
import { prisma } from "@/lib/db";
import { POSTS } from "@/lib/blog";
import { GAMES } from "@/lib/games";

export type PublicBlogPost = {
  slug: string; title: string; excerpt: string; content: string | null; coverImageUrl: string | null;
  coverImageAlt: string | null; seoTitle: string | null; seoDescription: string | null;
  publishedAt: Date; category: { slug: string; name: string; gameSlug: string | null };
};

const legacy: PublicBlogPost[] = POSTS.map(post => ({
  slug: post.slug, title: post.title, excerpt: post.excerpt, content: null, coverImageUrl: null, coverImageAlt: null,
  seoTitle: null, seoDescription: null, publishedAt: new Date(post.date), category: { slug: "general", name: "General", gameSlug: null },
}));

export async function getPublishedPosts(categorySlug?: string): Promise<PublicBlogPost[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: { published: true, ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
      include: { category: { select: { slug: true, name: true, gameSlug: true } } }, orderBy: { publishedAt: "desc" },
    });
    const databasePosts = rows.map(row => ({ ...row, publishedAt: row.publishedAt ?? row.createdAt }));
    return categorySlug ? databasePosts : [...databasePosts, ...legacy].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  } catch { return categorySlug === "general" || !categorySlug ? legacy : []; }
}

export async function getPublishedPost(slug: string): Promise<PublicBlogPost | null> {
  try {
    const row = await prisma.blogPost.findFirst({ where: { slug, published: true }, include: { category: { select: { slug: true, name: true, gameSlug: true } } } });
    if (row) return { ...row, publishedAt: row.publishedAt ?? row.createdAt };
  } catch {}
  return legacy.find(post => post.slug === slug) ?? null;
}

export async function getBlogCategories() {
  try {
    const rows = await prisma.blogCategory.findMany({ include: { _count: { select: { posts: { where: { published: true } } } } }, orderBy: { name: "asc" } });
    const categories = rows.map(row => ({ slug: row.slug, name: row.name, description: row.description, gameSlug: row.gameSlug, count: row._count.posts }));
    for (const game of GAMES) if (!categories.some(category => category.slug === game.slug)) categories.push({ slug: game.slug, name: game.name, description: `Guides, news and tips for ${game.name}.`, gameSlug: game.slug, count: 0 });
    if (!categories.some(category => category.slug === "general")) categories.push({ slug: "general", name: "General", description: "QUP.gg product news and gaming guides.", gameSlug: null, count: legacy.length });
    else categories.find(category => category.slug === "general")!.count += legacy.length;
    return categories;
  } catch { return [{ slug: "general", name: "General", description: "QUP.gg product news and gaming guides.", gameSlug: null, count: legacy.length }, ...GAMES.map(game => ({ slug: game.slug, name: game.name, description: `Guides, news and tips for ${game.name}.`, gameSlug: game.slug, count: 0 }))]; }
}
