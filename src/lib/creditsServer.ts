import { prisma } from "@/lib/db";
import { getCreditPackage } from "@/lib/credits";
import { Prisma } from "@/generated/prisma/client";

/**
 * Puts store credit back after a spend that led nowhere.
 *
 * Balance and ledger move together, and the ledger's unique
 * (userId, orderId, REFUND) index makes a repeat a no-op rather than a second
 * credit — the same trade lib/orderRefunds.ts makes, for the same reason: a
 * retried action and two open tabs both send this twice.
 */
export async function refundCreditsToUser(
  userId: string,
  amountEUR: number,
  note: string,
  orderId: string,
): Promise<boolean> {
  const cents = Math.round(amountEUR * 100);
  if (cents <= 0) return false;

  try {
    await prisma.$transaction([
      prisma.creditTransaction.create({
        data: { userId, orderId, type: "REFUND", amountCents: cents, note },
      }),
      prisma.user.update({ where: { id: userId }, data: { creditBalanceCents: { increment: cents } } }),
    ]);
    return true;
  } catch (err) {
    // The unique index rejecting a duplicate is the mechanism working, not a
    // failure: this spend has already been paid back.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}

/**
 * Grants a bought credit package.
 *
 * Only ever called once the money is confirmed — from the Stripe webhook, or
 * from the action when a saved card cleared straight away. The caller has to
 * have claimed the charge first (see lib/chargeFulfilment.ts); this function
 * itself just books the ledger.
 *
 * The bonus stays its own row so a statement can show what was paid for and
 * what was a gift.
 */
export async function grantCreditPackage(userId: string, packageId: string) {
  const pkg = getCreditPackage(packageId);
  if (!pkg) return null;

  const payCents = Math.round(pkg.payEUR * 100);
  const bonusCents = Math.round(pkg.bonusEUR * 100);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { creditBalanceCents: { increment: payCents + bonusCents } },
    }),
    prisma.creditTransaction.create({
      data: { userId, type: "TOPUP", amountCents: payCents, note: `Loaded €${pkg.payEUR}` },
    }),
    ...(bonusCents > 0
      ? [
          prisma.creditTransaction.create({
            data: { userId, type: "BONUS", amountCents: bonusCents, note: `Bonus for €${pkg.payEUR} package` },
          }),
        ]
      : []),
  ]);

  return pkg;
}
