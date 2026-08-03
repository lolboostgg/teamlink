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
  if (session.user.role !== "CLIENT") throw new Error("Credits are only available to client accounts.");

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

// Used by checkout (pay with credits) and the rebook/"keep playing" flow.
// Re-checks the balance server-side inside the transaction instead of
// trusting the client's last-known balance — two tabs spending at once, or
// a stale balance shown for a few seconds, shouldn't be able to push the
// account negative.
export async function spendCredits(amountEUR: number, note: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "You need to be signed in." };
  if (session.user.role !== "CLIENT") return { ok: false, error: "Credits are only available to client accounts." };

  const amountCents = Math.round(amountEUR * 100);
  if (amountCents <= 0) return { ok: false, error: "Invalid amount." };

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      if (user.creditBalanceCents < amountCents) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      await tx.user.update({ where: { id: session.user.id }, data: { creditBalanceCents: { decrement: amountCents } } });
      await tx.creditTransaction.create({
        data: { userId: session.user.id, type: "SPEND", amountCents: -amountCents, note },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return { ok: false, error: "Not enough credits." };
    }
    throw err;
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
