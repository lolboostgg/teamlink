import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { GAMES } from "@/lib/games";
import { BlogCoverField } from "@/components/dashboard/admin/BlogCoverField";
import { updateBlogPost } from "../actions";

export const dynamic = "force-dynamic";
export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("support"); const { id } = await params; const post = await prisma.blogPost.findUnique({ where: { id }, include: { category: true } }); if (!post) notFound();
  return <section className="dashboard-panel"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Edit article</div><div className="dashboard-panel__sub">Changes to a published article appear immediately.</div></div><Link href="/dashboard/admin/blog" className="btn btn--outline btn--sm"><i className="fa-solid fa-arrow-left"/> Blog CMS</Link></div>
    <form action={updateBlogPost} className="admin-blog-form"><input type="hidden" name="id" value={post.id}/>
      <label><span>Title</span><input name="title" required defaultValue={post.title}/></label><label><span>Slug</span><input name="slug" required defaultValue={post.slug}/></label>
      <label><span>Game category</span><select name="category" defaultValue={post.category.slug}><option value="general">General</option>{GAMES.map(game => <option key={game.slug} value={game.slug}>{game.name}</option>)}</select></label><BlogCoverField/>
      <label className="admin-blog-form__wide"><span>Short description</span><textarea name="excerpt" required rows={3} defaultValue={post.excerpt}/></label><label><span>Image description</span><input name="coverImageAlt" defaultValue={post.coverImageAlt ?? ""}/></label>
      <label><span>SEO title</span><input name="seoTitle" maxLength={65} defaultValue={post.seoTitle ?? ""}/></label><label><span>SEO description</span><input name="seoDescription" maxLength={160} defaultValue={post.seoDescription ?? ""}/></label>
      <label className="admin-blog-form__wide"><span>Article content</span><textarea name="content" required rows={18} defaultValue={post.content}/></label><button className="btn btn--vivid" type="submit"><i className="fa-solid fa-floppy-disk"/> Save changes</button>
    </form>
  </section>;
}
