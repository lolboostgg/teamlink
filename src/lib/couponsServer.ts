import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Coupons, decided server-side.
 *
 * They used to live in localStorage, which meant a code only existed in the
 * browser that earned it and could be handed back to itself for ever by
 * clearing site data. Now the row is the truth: who owns it, whether it is
 * still open, and which order consumed it.
 */

export const SESSION_REWARD_PERCENT = 10;

/** The post-session reward code, derived from the order so it is stable. */
export function couponCodeForOrder(orderId: string): string {
  return `TL10-${orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-6)}`;
}

/**
 * Hands the customer their "10% off next time" code when a session closes.
 * Idempotent by code, so a redelivered completion cannot mint two.
 */
export async function issueSessionRewardCoupon(orderId: string, ownerUserId: string | null) {
  if (!ownerUserId) return null;
  const code = couponCodeForOrder(orderId);
  return prisma.coupon.upsert({
    where: { code },
    create: {
      code,
      discountPercent: SESSION_REWARD_PERCENT,
      source: orderId,
      ownerUserId,
      // Long enough to be a reason to come back, short enough to be one.
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });
}

export interface RedeemableCoupon {
  id: string;
  code: string;
  discountPercent: number;
}

/**
 * Looks up a code the given account may actually use right now: unredeemed,
 * unexpired, and either public or their own. Returns null for anything else,
 * without saying which of those it failed — a coupon lookup shouldn't
 * confirm that someone else's code exists.
 */
export async function findRedeemableCoupon(code: string, userId: string | null): Promise<RedeemableCoupon | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;

  const coupon = await prisma.coupon.findUnique({ where: { code: clean } });
  if (!coupon || coupon.usedAt) return null;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return null;
  if (coupon.ownerUserId && coupon.ownerUserId !== userId) return null;

  return { id: coupon.id, code: coupon.code, discountPercent: coupon.discountPercent };
}

/**
 * Burns a coupon onto an order, inside the caller's transaction.
 *
 * The `usedAt: null` filter is the whole safety mechanism: two checkouts
 * racing on the same code means the second update matches nothing, and the
 * caller learns the coupon was already gone instead of granting it twice.
 */
export async function reserveCoupon(
  tx: Prisma.TransactionClient,
  couponId: string,
  orderId: string,
): Promise<boolean> {
  const result = await tx.coupon.updateMany({
    where: { id: couponId, usedAt: null },
    data: { usedAt: new Date(), usedOnOrderId: orderId },
  });
  return result.count === 1;
}

/**
 * Gives a coupon back when the payment it was reserved for never happened —
 * an abandoned or expired Stripe checkout shouldn't cost the customer their
 * discount.
 */
export async function releaseCouponForOrder(orderId: string) {
  await prisma.coupon.updateMany({
    where: { usedOnOrderId: orderId },
    data: { usedAt: null, usedOnOrderId: null },
  });
}
