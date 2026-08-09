import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canOpenDashboard, dashboardHrefForRole } from "@/lib/roles";

// Same access-boundary pattern as dashboard/admin/layout.tsx, widened so an
// admin can see what a teammate sees (see lib/roles.ts).
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

  return (
    <>
      {/* An admin without a roster profile of their own gets empty panels
          everywhere in here. Saying why beats letting them read zeroes and
          wonder whether something is broken. */}
      {!teammate && (
        <div className="dashboard-notice">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <div>
            <strong>You&rsquo;re looking at the teammate dashboard as an admin</strong>
            <span>
              This account has no roster profile, so the panels below have nothing of their own to show. Open a
              teammate from <Link href="/dashboard/admin/teammates">Teammates</Link> to see their real figures.
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
