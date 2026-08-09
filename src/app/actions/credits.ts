"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getCreditPackage } from "@/lib/credits";
import { startCheckout } from "@/lib/stripeCheckout";
import { publish } from "@/lib/events/bus";
import type { PaymentMethodKey } from "@/lib/payments";

/**
 * Buying credit is a real payment now: this only opens the hosted checkout.
 * The balance is granted by the webhook once Stripe confirms it — coming back
 * to the wallet page is not, on its own, proof that anything was paid.
 */
export async function purchaseCredits(
  packageId: string,
  method: PaymentMethodKey = "card",
): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "You need to be signed in to buy credits." };
  if (session.user.role !== "CLIENT") return { ok: false, error: "Credits are only available to client accounts." };

  const pkg = getCreditPackage(packageId);
  if (!pkg) return { ok: false, error: "Unknown credit package." };

  try {
    const checkout = await startCheckout({
      amountEUR: pkg.payEUR,
      description: `QUP.gg credits · €${pkg.payEUR}${pkg.bonusEUR > 0 ? ` (+€${pkg.bonusEUR} bonus)` : ""}`,
      returnPath: "/dashboard/client/wallet",
      kind: "CREDITS",
      methods: method === "paypal" ? ["paypal"] : ["card"],
      extraMetadata: { packageId: pkg.id },
    });
    return { ok: true, redirect: checkout.url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
  }
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

  // Every credit spend funnels through here — tips, replays, extra games —
  // so one signal from this point keeps the header's balance honest without
  // each caller having to remember to send it.
  await publish({ topic: "orders", key: "credits", userIds: [session.user.id] });
  revalidatePath("/", "layout");
  return { ok: true };
}
