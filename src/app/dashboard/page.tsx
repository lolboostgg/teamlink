import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dashboardHrefForRole } from "@/lib/roles";

export default async function DashboardIndexPage() {
  const session = await auth();
  redirect(dashboardHrefForRole(session?.user?.role));
}
