"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getCreditPackage } from "@/lib/credits";

// No real payment gateway exists in this app (see lib/payments.ts) — this
// credits the ledger directly after the client-side mock-confirm step,
// same honesty level as the rest of checkout. Wiring this to an actual
// processor is future work, tracked separately.
export async function purchaseCredits(packageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You need to be signed in to buy credits.");

  const pkg = getCreditPackage(packageId);
  if (!pkg) throw new Error("Unknown credit package.");

  const payCents = Math.round(pkg.payEUR * 100);
  const bonusCents = Math.round(pkg.bonusEUR * 100);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { creditBalanceCents: { increment: payCents + bonusCents } },
    }),
    prisma.creditTransaction.create({
      data: { userId: session.user.id, type: "TOPUP", amountCents: payCents, note: `Loaded €${pkg.payEUR}` },
    }),
    ...(bonusCents > 0
      ? [
          prisma.creditTransaction.create({
            data: { userId: session.user.id, type: "BONUS", amountCents: bonusCents, note: `Bonus for €${pkg.payEUR} package` },
          }),
        ]
      : []),
  ]);

  revalidatePath("/", "layout");
}
