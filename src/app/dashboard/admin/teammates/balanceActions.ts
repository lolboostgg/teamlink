"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { notifyUser } from "@/lib/notifications/service";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Admins only.");
  return session.user.id;
}

export interface AdjustBalanceInput {
  teammateId: string;
  /** Always positive; `direction` decides the sign. */
  amountEUR: number;
  direction: "add" | "fine";
  reason: string;
}

/**
 * Credits or fines a teammate's balance.
 *
 * Written as an ADJUSTMENT row plus a balance move in one transaction, the
 * same shape as an order payout — the ledger stays the whole story of how a
 * balance got where it is, and a correction is a new entry rather than an
 * edit to an old one.
 *
 * A reason is mandatory: this shows up on the teammate's payments page, and
 * "your balance dropped by €20" with no explanation is how support tickets
 * are made.
 */
export async function adjustTeammateBalance(input: AdjustBalanceInput) {
  const adminId = await requireAdmin();

  const reason = input.reason.trim().slice(0, 300);
  if (!reason) throw new Error("Give a reason — the teammate sees it.");

  const amount = Math.round(Math.abs(input.amountEUR) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");

  const signed = input.direction === "fine" ? -amount : amount;

  const teammate = await prisma.$transaction(async (tx) => {
    const current = await tx.teammate.findUnique({
      where: { id: input.teammateId },
      select: { id: true, name: true, balanceEUR: true, userId: true },
    });
    if (!current) throw new Error("Unknown teammate.");

    // A fine may not push a balance negative: the ledger would then imply
    // the teammate owes the platform, which nothing in the payout flow can
    // settle. Cap it and say so.
    if (signed < 0 && amount > Number(current.balanceEUR)) {
      throw new Error(`Their balance is only €${Number(current.balanceEUR).toFixed(2)}.`);
    }

    await tx.teammateEarning.create({
      data: {
        teammateId: current.id,
        type: "ADJUSTMENT",
        amountEUR: new Prisma.Decimal(signed),
        note: reason,
      },
    });

    await tx.teammate.update({
      where: { id: current.id },
      data: { balanceEUR: { increment: new Prisma.Decimal(signed) } },
    });

    return current;
  });

  if (teammate.userId) {
    await notifyUser(teammate.userId, {
      type: input.direction === "fine" ? "balance.fined" : "balance.credited",
      title: input.direction === "fine" ? `€${amount.toFixed(2)} deducted from your balance` : `€${amount.toFixed(2)} added to your balance`,
      body: reason,
      href: "/dashboard/teammate/payments",
    });
  }

  // The admin acts from the teammate page; the payout queue and the
  // teammate's own view both read the same balance.
  revalidatePath("/dashboard/admin/teammates");
  revalidatePath("/dashboard/admin/payouts");
  revalidatePath("/dashboard/teammate/payments");

  return { adminId };
}
