import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canOpenDashboard, dashboardHrefForRole } from "@/lib/roles";

// Same access-boundary pattern as dashboard/admin/layout.tsx, widened: an
// admin may look at the teammate dashboard too, provided the account actually
// has a Teammate row behind it — every panel in here reads that profile, so
// without one the pages would render against nothing.
export default async function TeammateDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) return <>{children}</>;

  const teammate = await prisma.teammate.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!canOpenDashboard(session.user.role, Boolean(teammate), "teammate")) {
    redirect(dashboardHrefForRole(session.user.role));
  }
  return <>{children}</>;
}
