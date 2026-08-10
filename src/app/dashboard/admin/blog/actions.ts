"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { writeAudit } from "@/lib/admin/audit";
import { GAMES } from "@/lib/games";

function slugify(value: string) {
  return value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createBlogPost(formData: FormData) {
  const { user } = await requireAdmin("support");
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const categorySlug = slugify(String(formData.get("category") ?? "general")) || "general";
  const slug = slugify(requestedSlug || title);
  if (title.length < 5 || excerpt.length < 20 || content.length < 50 || !slug) throw new Error("Title, excerpt and article content are required.");
  const game = GAMES.find((item) => item.slug === categorySlug);
  const published = formData.get("published") === "on";
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim() || null;
  const category = await prisma.blogCategory.upsert({
    where: { slug: categorySlug },
    update: { name: game?.name ?? "General", gameSlug: game?.slug ?? null },
    create: { slug: categorySlug, name: game?.name ?? "General", gameSlug: game?.slug ?? null, description: game ? `Guides, news and tips for ${game.name}.` : "QUP.gg news, product updates and gaming guides." },
  });
  const post = await prisma.blogPost.create({ data: {
    slug, title, excerpt, content, coverImageUrl,
    coverImageAlt: String(formData.get("coverImageAlt") ?? "").trim() || title,
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
    published, publishedAt: published ? new Date() : null, categoryId: category.id, authorId: user.id,
  }});
  await writeAudit({ actorId: user.id, action: "blog.post_created", entityType: "BlogPost", entityId: post.id, reason: published ? "Created and published article" : "Created draft", after: { slug, title, category: categorySlug, published } });
  revalidatePath("/blog"); revalidatePath("/blog/categories"); revalidatePath("/dashboard/admin/blog");
}

export async function toggleBlogPost(formData: FormData) {
  const { user } = await requireAdmin("support");
  const id = String(formData.get("id") ?? "");
  const current = await prisma.blogPost.findUnique({ where: { id }, select: { published: true, slug: true } });
  if (!current) throw new Error("Article not found.");
  const published = !current.published;
  await prisma.blogPost.update({ where: { id }, data: { published, publishedAt: published ? new Date() : null } });
  await writeAudit({ actorId: user.id, action: published ? "blog.post_published" : "blog.post_unpublished", entityType: "BlogPost", entityId: id, before: { published: current.published }, after: { published } });
  revalidatePath("/blog"); revalidatePath(`/blog/${current.slug}`); revalidatePath("/dashboard/admin/blog");
}

export async function updateBlogPost(formData: FormData) {
  const { user } = await requireAdmin("support");
  const id = String(formData.get("id") ?? ""); const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim(); const content = String(formData.get("content") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? title)); const categorySlug = slugify(String(formData.get("category") ?? "general")) || "general";
  if (!id || title.length < 5 || excerpt.length < 20 || content.length < 50 || !slug) throw new Error("Title, excerpt and article content are required.");
  const before = await prisma.blogPost.findUnique({ where: { id }, select: { slug: true, title: true, coverImageUrl: true } }); if (!before) throw new Error("Article not found.");
  const game = GAMES.find(item => item.slug === categorySlug); const category = await prisma.blogCategory.upsert({ where: { slug: categorySlug }, update: { name: game?.name ?? "General", gameSlug: game?.slug ?? null }, create: { slug: categorySlug, name: game?.name ?? "General", gameSlug: game?.slug ?? null } });
  const uploadedCover = String(formData.get("coverImageUrl") ?? "").trim();
  await prisma.blogPost.update({ where: { id }, data: { slug, title, excerpt, content, categoryId: category.id, coverImageUrl: uploadedCover || before.coverImageUrl, coverImageAlt: String(formData.get("coverImageAlt") ?? "").trim() || title, seoTitle: String(formData.get("seoTitle") ?? "").trim() || null, seoDescription: String(formData.get("seoDescription") ?? "").trim() || null } });
  await writeAudit({ actorId: user.id, action: "blog.post_updated", entityType: "BlogPost", entityId: id, before: { slug: before.slug, title: before.title }, after: { slug, title, category: categorySlug } });
  revalidatePath("/blog"); revalidatePath(`/blog/${before.slug}`); revalidatePath(`/blog/${slug}`); revalidatePath("/dashboard/admin/blog");
}
