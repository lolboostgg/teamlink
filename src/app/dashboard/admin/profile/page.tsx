import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ClientProfileForm } from "@/components/dashboard/client/ClientProfileForm";

export const metadata: Metadata = { title: "Admin profile" };
export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  if (!user) return null;
  return <div className="dashboard-panel">
    <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">My profile</div><div className="dashboard-panel__sub">Update your admin name and profile picture</div></div></div>
    <ClientProfileForm initial={{ name: user.name || "Admin", email: user.email, avatarUrl: user.avatarUrl || "" }} section="profile" />
  </div>;
}
