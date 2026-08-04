"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { payoutBreakdown } from "@/lib/payouts";
import { notifyUser } from "@/lib/notifications/service";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Admins only.");
  return session.user.id;
}

/**
 * Settles a payout request: books it against the ledger and takes it off the
 * balance, in one transaction.
 *
 * A full-balance request is resolved *here*, against the balance as it stands
 * right now — that's the whole point of storing it as intent. Someone who
 * asked on the 10th with €50 and finished four more orders by the 15th gets
 * the €60 they actually have.
 */
export async function markPayoutPaid(requestId: string, adminNote: string) {
  const adminId = await requireAdmin();

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.payoutRequest.findUnique({
      where: { id: requestId },
      include: { teammate: { select: { id: true, name: true, balanceEUR: true, userId: true } } },
    });
    if (!request) throw new Error("Unknown payout request.");
    if (request.status !== "PENDING") throw new Error("That request has already been dealt with.");

    const balance = Number(request.teammate.balanceEUR);
    const requested = request.amountEUR === null ? balance : Number(request.amountEUR);

    if (balance <= 0) throw new Error("That teammate has no balance to pay out.");
    // A fixed amount can outrun the balance if an earlier correction reduced
    // it after the request was filed.
    if (requested > balance) {
      throw new Error(`Their balance is only €${balance.toFixed(2)} — adjust or reject this request.`);
    }

    const { gross, fee, net } = payoutBreakdown(requested, Number(request.feePercent));

    await tx.teammateEarning.create({
      data: {
        teammateId: request.teammate.id,
        type: "PAYOUT_SENT",
        // Negative: this leaves the balance. The fee is the platform's cut of
        // that same amount, not a second movement.
        amountEUR: new Prisma.Decimal(-gross),
        note: `Payout #${request.requestNo} · €${net.toFixed(2)} sent after ${Number(request.feePercent)}% fee`,
      },
    });

    await tx.teammate.update({
      where: { id: request.teammate.id },
      data: { balanceEUR: { decrement: new Prisma.Decimal(gross) } },
    });

    await tx.payoutRequest.update({
      where: { id: request.id },
      data: {
        status: "PAID",
        grossEUR: new Prisma.Decimal(gross),
        feeEUR: new Prisma.Decimal(fee),
        netEUR: new Prisma.Decimal(net),
        adminNote: adminNote.trim().slice(0, 300) || null,
        processedById: adminId,
        processedAt: new Date(),
      },
    });

    return { userId: request.teammate.userId, requestNo: request.requestNo, net };
  });

  if (result.userId) {
    await notifyUser(result.userId, {
      type: "payout.paid",
      title: "Your payout is on its way",
      body: `€${result.net.toFixed(2)} sent for payout #${result.requestNo}.`,
      href: "/dashboard/teammate/payments",
    });
  }

  revalidatePath("/dashboard/admin/payouts");
  revalidatePath("/dashboard/teammate/payments");
}

export async function rejectPayout(requestId: string, adminNote: string) {
  const adminId = await requireAdmin();

  const request = await prisma.payoutRequest.findUnique({
    where: { id: requestId },
    include: { teammate: { select: { userId: true } } },
  });
  if (!request) throw new Error("Unknown payout request.");
  if (request.status !== "PENDING") throw new Error("That request has already been dealt with.");

  await prisma.payoutRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      adminNote: adminNote.trim().slice(0, 300) || null,
      processedById: adminId,
      processedAt: new Date(),
    },
  });

  // Nothing was debited, so the balance is untouched and they can re-request.
  if (request.teammate.userId) {
    await notifyUser(request.teammate.userId, {
      type: "payout.rejected",
      title: "Your payout request was declined",
      body: adminNote.trim().slice(0, 120) || "Check your payments page for details.",
      href: "/dashboard/teammate/payments",
    });
  }

  revalidatePath("/dashboard/admin/payouts");
  revalidatePath("/dashboard/teammate/payments");
}
