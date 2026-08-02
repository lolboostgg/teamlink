import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dashboardHrefForRole } from "@/lib/roles";

// Same access-boundary pattern as dashboard/admin/layout.tsx.
export default async function TeammateDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session && session.user.role !== "TEAMMATE") {
    redirect(dashboardHrefForRole(session.user.role));
  }
  return <>{children}</>;
}
