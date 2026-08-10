import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dashboardHrefForRole } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { readTwoFactor } from "@/lib/twoFactor";
import { AdminTwoFactorGate } from "@/components/dashboard/admin/AdminTwoFactorGate";

// Nested inside src/app/dashboard/layout.tsx (the shared sidebar/topbar
// shell) — this is the actual access boundary: a signed-in non-admin gets
// bounced to their own dashboard. Signed-out visitors fall through to the
// parent layout's DashboardAuthGate lock screen instead.
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session && session.user.role !== "ADMIN") {
    redirect(dashboardHrefForRole(session.user.role));
  }
  if (session?.user?.id) {
    const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notificationPrefs: true } });
    if (admin && !readTwoFactor(admin.notificationPrefs)) return <AdminTwoFactorGate />;
  }
  return <>{children}</>;
}
