import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { GAMES } from "@/lib/games";
import { createBlogPost, toggleBlogPost } from "./actions";
import { BlogCoverField } from "@/components/dashboard/admin/BlogCoverField";
import Link from "next/link";

export const metadata: Metadata = { title: "Blog CMS" };
export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  await requireAdmin("support");
  const posts = await prisma.blogPost.findMany({ include: { category: true, author: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } });
  return <div className="admin-blog-page">
    <section className="dashboard-panel"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Create article</div><div className="dashboard-panel__sub">Write, preview and publish gaming content for the public QUP.gg blog.</div></div></div>
      <form action={createBlogPost} className="admin-blog-form">
        <label><span>Title</span><input name="title" required minLength={5} placeholder="Article title" /></label>
        <label><span>Slug <small>optional</small></span><input name="slug" placeholder="generated-from-title" /></label>
        <label><span>Game category</span><select name="category" defaultValue="general"><option value="general">General</option>{GAMES.map(game => <option key={game.slug} value={game.slug}>{game.name}</option>)}</select></label>
        <label className="admin-blog-form__wide"><span>Short description</span><textarea name="excerpt" required minLength={20} rows={3} placeholder="Shown on article cards and in search results." /></label>
        <BlogCoverField />
        <label><span>Image description</span><input name="coverImageAlt" placeholder="What is shown in the image?" /></label>
        <label><span>SEO title <small>optional</small></span><input name="seoTitle" maxLength={65} /></label>
        <label><span>SEO description <small>optional</small></span><input name="seoDescription" maxLength={160} /></label>
        <label className="admin-blog-form__wide"><span>Article content</span><textarea name="content" required minLength={50} rows={16} placeholder={'Use blank lines for paragraphs. Start a heading with "## ". Start list items with "- ".'} /></label>
        <label className="admin-blog-form__publish"><input name="published" type="checkbox" /> <span>Publish immediately</span></label>
        <button className="btn btn--vivid" type="submit"><i className="fa-solid fa-pen-nib" /> Create article</button>
      </form>
    </section>
    <section className="dashboard-panel"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Articles</div><div className="dashboard-panel__sub">{posts.length} articles and drafts</div></div></div>
      <div className="admin-blog-list">{posts.length === 0 ? <div className="empty-state">No database articles yet.</div> : posts.map(post => <article key={post.id} className="admin-blog-row">
        <div><span className={`status-pill ${post.published ? "is-success" : ""}`}>{post.published ? "Published" : "Draft"}</span><h3>{post.title}</h3><p>{post.category.name} · /blog/{post.slug} · {post.author.name || post.author.email}</p></div>
        <div className="admin-blog-row__actions"><Link href={`/dashboard/admin/blog/${post.id}`} className="btn btn--outline btn--sm"><i className="fa-solid fa-pen"/> Edit</Link><form action={toggleBlogPost}><input type="hidden" name="id" value={post.id}/><button className="btn btn--outline btn--sm">{post.published ? "Unpublish" : "Publish"}</button></form></div>
      </article>)}</div>
    </section>
  </div>;
}
