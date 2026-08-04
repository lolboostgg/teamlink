"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { findRedeemableCoupon } from "@/lib/couponsServer";

export interface CouponView {
  code: string;
  discountPercent: number;
  expiresAt: number | null;
}

/** The signed-in customer's own unused codes, newest first. */
export async function listMyCoupons(): Promise<CouponView[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await prisma.coupon.findMany({
    where: {
      ownerUserId: session.user.id,
      usedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((row) => ({
    code: row.code,
    discountPercent: row.discountPercent,
    expiresAt: row.expiresAt?.getTime() ?? null,
  }));
}

/**
 * Checks a typed-in code so checkout can show the discount before paying.
 *
 * Only a preview: nothing is reserved here, and the real redemption happens
 * again inside placeCheckoutOrder — so a code that gets used in another tab
 * between these two calls still fails there, where it matters.
 */
export async function checkCoupon(code: string): Promise<CouponView | null> {
  const session = await auth();
  const coupon = await findRedeemableCoupon(code, session?.user?.id ?? null);
  if (!coupon) return null;
  return { code: coupon.code, discountPercent: coupon.discountPercent, expiresAt: null };
}
