"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PAYOUT_FEE_PERCENT, roundCents } from "@/lib/payouts";
import { notifyAdmins } from "@/lib/notifications/service";
import type { PayoutMethodType } from "@/lib/payoutMethods";

async function requireOwnTeammate() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  const teammate = await prisma.teammate.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, balanceEUR: true, verification: { select: { status: true } } },
  });
  if (!teammate) throw new Error("No teammate profile linked to this account.");
  return teammate;
}

export interface RequestPayoutInput {
  payoutMethodId: string;
  /** Ignored when `fullBalance` is set. */
  amountEUR: number;
  fullBalance: boolean;
  note: string;
}

/**
 * Files a payout request. Nothing moves yet — the balance is only debited
 * when an admin settles it, which is also when a full-balance request is
 * resolved to an actual number.
 */
export async function requestPayout(input: RequestPayoutInput) {
  const teammate = await requireOwnTeammate();

  if (teammate.verification?.status !== "APPROVED") {
    throw new Error("Your identity has to be verified before a payout can be requested.");
  }

  const method = await prisma.payoutMethod.findFirst({
    where: { id: input.payoutMethodId, teammateId: teammate.id },
  });
  if (!method) throw new Error("Pick one of your own payout methods.");

  const open = await prisma.payoutRequest.count({ where: { teammateId: teammate.id, status: "PENDING" } });
  if (open > 0) throw new Error("You already have a payout request waiting to be processed.");

  const balance = Number(teammate.balanceEUR);
  if (balance <= 0) throw new Error("There's nothing to pay out yet.");

  const amount = input.fullBalance ? null : roundCents(input.amountEUR);
  if (amount !== null) {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
    if (amount > balance) throw new Error("That's more than your available balance.");
  }

  const request = await prisma.payoutRequest.create({
    data: {
      teammateId: teammate.id,
      payoutMethodId: method.id,
      amountEUR: amount,
      // Frozen now, so changing the fee table later can't alter a payout
      // that was already quoted to somebody.
      feePercent: PAYOUT_FEE_PERCENT[method.type as PayoutMethodType],
      note: input.note.trim().slice(0, 300) || null,
    },
  });

  await notifyAdmins({
    type: "payout.requested",
    title: `${teammate.name} requested a payout`,
    body: amount === null ? "Full available balance" : `€${amount.toFixed(2)}`,
    href: "/dashboard/admin/payouts",
  });

  revalidatePath("/dashboard/teammate/payments");
  return { requestNo: request.requestNo };
}

/** Withdraws a request that hasn't been settled yet. */
export async function cancelPayoutRequest(requestId: string) {
  const teammate = await requireOwnTeammate();
  const { count } = await prisma.payoutRequest.updateMany({
    where: { id: requestId, teammateId: teammate.id, status: "PENDING" },
    data: { status: "CANCELLED", processedAt: new Date() },
  });
  if (count === 0) throw new Error("That request can no longer be cancelled.");
  revalidatePath("/dashboard/teammate/payments");
}
