import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DispatchBoard } from "@/components/dashboard/admin/DispatchBoard";

export const metadata: Metadata = { title: "Live dispatch" };
export const dynamic = "force-dynamic";

export default async function AdminDispatchPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Live dispatch</div>
          <div className="dashboard-panel__sub">
            Every order still looking for a teammate, the wave it is on, and who has been asked. Updates as it
            happens.
          </div>
        </div>
      </div>

      <DispatchBoard />
    </div>
  );
}
