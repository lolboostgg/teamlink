import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications/service";

/**
 * Chases messages that went unanswered.
 *
 * A customer typing into a live session and getting nothing back is the single
 * complaint worth spending a notification on, and it is also the one case the
 * rest of this codebase cannot catch on its own: every other clock-driven
 * transition runs inside reconcileOrder() when somebody reads the order, and
 * "nobody is reading the order" is precisely the situation here. Hence the
 * cron — see app/api/cron/notifications.
 *
 * Two escalations. After five minutes the teammate gets a Discord DM, because
 * they are the one who is supposed to be present. After thirty it becomes an
 * email as well, on the assumption that Discord was not read either.
 */
const DM_AFTER_MS = 5 * 60 * 1000;
const MAIL_AFTER_MS = 30 * 60 * 1000;

/** How far back to look. Anything older has been unanswered for half an hour
 * past the mail escalation and is not news any more. */
const LOOKBACK_MS = 6 * 60 * 60 * 1000;

export interface UnreadSweepResult {
  checked: number;
  dmSent: number;
  mailSent: number;
}

export async function sweepUnreadMessages(now = new Date()): Promise<UnreadSweepResult> {
  const result: UnreadSweepResult = { checked: 0, dmSent: 0, mailSent: 0 };

  // Only sessions that are actually running. A completed or cancelled order
  // has nothing to chase.
  const orders = await prisma.order.findMany({
    where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    select: {
      id: true,
      orderNo: true,
      gameName: true,
      customerLabel: true,
      candidates: {
        where: { selected: true },
        select: { teammateId: true, teammate: { select: { userId: true } } },
      },
    },
  });
  if (orders.length === 0) return result;

  const since = new Date(now.getTime() - LOOKBACK_MS);

  for (const order of orders) {
    for (const candidate of order.candidates) {
      if (!candidate.teammate.userId) continue;

      const key = `${order.id}::${candidate.teammateId}`;
      const last = await prisma.conversationMessage.findFirst({
        where: { conversationKey: key, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
      });

      // Nothing to answer unless the last word was the customer's.
      if (!last || last.sender !== "client") continue;

      const readBy = Array.isArray(last.readBy) ? (last.readBy as string[]) : [];
      if (readBy.includes("teammate")) continue;

      result.checked++;

      const waitedMs = now.getTime() - last.createdAt.getTime();
      if (waitedMs < DM_AFTER_MS) continue;

      // Two escalation types rather than one type with a stage flag, so the
      // channel table in notify/channels.ts can route them differently: the
      // first is a DM, the second adds mail.
      const type = waitedMs >= MAIL_AFTER_MS ? "order.unread_escalated" : "order.unread";

      // One notification per message per stage, not one per sweep. The bell
      // row is the record of having chased this already — anything written
      // after the message arrived means this stage is done, so a
      // minute-by-minute cron doesn't become a minute-by-minute DM.
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: candidate.teammate.userId,
          type,
          href: `/dashboard/teammate/session/${order.id}`,
          createdAt: { gte: last.createdAt },
        },
        select: { id: true },
      });
      if (alreadySent) continue;

      const minutes = Math.floor(waitedMs / 60_000);
      await notifyUser(candidate.teammate.userId, {
        type,
        title: "Unanswered message",
        body: `${order.customerLabel} has been waiting ${minutes} minutes for a reply on ${order.gameName} (#${order.orderNo}).`,
        href: `/dashboard/teammate/session/${order.id}`,
      });

      if (type === "order.unread_escalated") result.mailSent++;
      else result.dmSent++;
    }
  }

  return result;
}
