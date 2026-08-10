import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/notify/mail";
import { winBackMail } from "@/lib/notify/templates";
import { appUrl } from "@/lib/notify/orderNotifications";
import { couponCodeForOrder } from "@/lib/couponsServer";
import { onlineTeammatesByGame } from "@/lib/gameAvailability";

/**
 * The one message that goes out to somebody whose session never happened.
 *
 * A cancelled order already sends a receipt saying the money came back. That
 * is the end of the conversation today: the customer wanted to play, we could
 * not find them anybody, they were refunded, and nothing ever asks them to try
 * again. This does, once, a day later, with a discount and a real number for
 * how many teammates are online for that game now.
 *
 * A day, not an hour: an hour later they are still annoyed, and a week later
 * they have forgotten they ever tried.
 *
 * Deliberately one mail per order and never a series. It is the difference
 * between a reason to come back and a campaign, and a campaign is the thing
 * that costs the deliverability of the receipts.
 */

/** How much off, for having been let down. */
export const WIN_BACK_PERCENT = 15;

/** How long they have to use it. */
const COUPON_DAYS = 14;

/**
 * The window a cancelled order is chased in.
 *
 * Orders are cancelled within minutes of being created — the dispatch clock
 * is measured in seconds — so createdAt is a good enough stand-in for a
 * cancelledAt column that does not exist. The band is wide so a cron that
 * misses a few runs still catches everything; sending twice is prevented by
 * the coupon, not by the window.
 */
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 96 * 60 * 60 * 1000;

export interface WinBackResult {
  considered: number;
  mailed: number;
}

export async function sweepWinBack(): Promise<WinBackResult> {
  const now = Date.now();
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["CANCELLED", "NO_MATCH"] },
      createdAt: { gte: new Date(now - MAX_AGE_MS), lte: new Date(now - MIN_AGE_MS) },
    },
    select: {
      id: true,
      orderNo: true,
      gameSlug: true,
      gameName: true,
      option: true,
      guestEmail: true,
      clientUserId: true,
      clientUser: { select: { email: true, name: true, notificationPrefs: true } },
    },
    take: 200,
  });

  if (orders.length === 0) return { considered: 0, mailed: 0 };

  // One coupon per order, and its existence is what says "already chased".
  // No column to add, and idempotent against a cron that runs twice.
  const existing = await prisma.coupon.findMany({
    where: { source: { in: orders.map((order) => order.id) } },
    select: { source: true },
  });
  const chased = new Set(existing.map((coupon) => coupon.source));

  const online = await onlineTeammatesByGame();
  let mailed = 0;

  for (const order of orders) {
    if (chased.has(order.id)) continue;

    const to = order.clientUser?.email ?? order.guestEmail;
    if (!to) continue;

    const code = couponCodeForOrder(order.id);
    try {
      // Created before the send, so a mail that fails does not leave the
      // order eligible for ever — and a coupon nobody was told about costs
      // nothing.
      await prisma.coupon.create({
        data: {
          code,
          discountPercent: WIN_BACK_PERCENT,
          source: order.id,
          // Owned where there is an account to own it. A guest coupon has no
          // owner and is redeemable by whoever holds the code, which is the
          // person we just mailed it to — and it is single-use either way.
          ownerUserId: order.clientUserId,
          expiresAt: new Date(now + COUPON_DAYS * 24 * 60 * 60 * 1000),
        },
      });
    } catch {
      // Unique on `code`: another run got there first. Leave it alone.
      continue;
    }

    const mail = winBackMail({
      name: order.clientUser?.name ?? null,
      gameName: order.gameName,
      option: order.option,
      orderNo: order.orderNo,
      code,
      percent: WIN_BACK_PERCENT,
      days: COUPON_DAYS,
      onlineNow: online[order.gameSlug] ?? 0,
      url: `${appUrl()}/games/${order.gameSlug}`,
    });

    if (await sendMail({ to, ...mail })) mailed += 1;
  }

  return { considered: orders.length, mailed };
}
