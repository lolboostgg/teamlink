import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { VerificationEditor } from "@/components/dashboard/teammate/VerificationEditor";
import type { PayoutMethodType } from "@/lib/payoutMethods";

export const metadata: Metadata = { title: "Verification & Payouts" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

export default async function TeammateVerificationPage() {
  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({
        where: { userId: session.user.id },
        include: { verification: true, payoutMethods: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  if (!teammate) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Verification &amp; Payouts</div>
            <div className="dashboard-panel__sub">No teammate profile is linked to this account yet.</div>
          </div>
        </div>
      </div>
    );
  }

  const v = teammate.verification;

  return (
    <VerificationEditor
      storageReady={isStorageConfigured()}
      verification={{
        status: v?.status ?? "UNSUBMITTED",
        fullName: v?.fullName ?? "",
        dateOfBirth: v?.dateOfBirth ?? "",
        address: v?.address ?? "",
        country: v?.country ?? "",
        idFrontPath: v?.idFrontPath ?? null,
        idBackPath: v?.idBackPath ?? null,
        selfiePath: v?.selfiePath ?? null,
        reviewNote: v?.reviewNote ?? null,
      }}
      methods={teammate.payoutMethods.map((m) => ({
        id: m.id,
        type: m.type as PayoutMethodType,
        details: (m.details as Record<string, string> | null) ?? {},
        isDefault: m.isDefault,
      }))}
    />
  );
}
