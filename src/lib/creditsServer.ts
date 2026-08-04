import { prisma } from "@/lib/db";
import { getCreditPackage } from "@/lib/credits";

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
