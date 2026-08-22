import "server-only";

import { prisma } from "@/lib/db";
import { DISPATCH_EVENT, logDispatch } from "@/lib/dispatch/log";
import { handoverEligibility } from "@/lib/dispatch/waves";
import { publishOrderChange } from "@/lib/dispatch/service";
import { notifyUser } from "@/lib/notifications/service";

/**
 * Handing an assigned order to a teammate the customer asked for by name.
 *
 * The customer wants a particular person; the dispatcher does not take
 * requests, and reassigning through the admin panel means waiting on an
 * admin. So the teammate holding the order mints a link, sends it to whoever
 * was asked for, and that person accepts or declines it themselves.
 *
 * The link is a bearer capability, exactly like an order's accessToken: the
 * offerer knows who they are sending it to and we do not, so possession is
 * what it proves. What it does *not* do is bypass the gates — whoever opens
 * it still has to be a teammate the dispatcher would have been willing to
 * send this order to, and that is checked when they accept rather than when
 * the link is made.
 */

/** Long enough to send it over Discord and get an answer, short enough that a
 * forgotten link is not still live tomorrow. */
export const HANDOVER_TTL_MS = 30 * 60_000;

function newHandoverToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export type HandoverState =
  | "open"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired"
  | "stale"
  | "missing";

type HandoverRow = {
  expiresAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
  order: { status: string; sessionStatus: string | null };
};

/**
 * Why a link is not usable, or that it is.
 *
 * `stale` is its own answer rather than a flavour of revoked: the link was
 * fine and the order moved out from under it — the session started, the
 * customer cancelled, or a reroll took it away. That is the one of these
 * that is nobody's mistake, and the page says so.
 */
export function handoverState(handover: HandoverRow, now: Date = new Date()): HandoverState {
  if (handover.acceptedAt) return "accepted";
  if (handover.declinedAt) return "declined";
  if (handover.revokedAt) return "revoked";
  if (handover.expiresAt.getTime() <= now.getTime()) return "expired";
  if (handover.order.status !== "ASSIGNED") return "stale";
  // Anything past the invite means they are already in game together, and the
  // agreed scope stops at the session start.
  if ((handover.order.sessionStatus ?? "WAITING_FOR_INVITE") !== "WAITING_FOR_INVITE") return "stale";
  return "open";
}

export async function openHandover(token: string) {
  return prisma.orderHandover.findUnique({
    where: { token },
    include: {
      fromTeammate: { select: { id: true, name: true, avatarUrl: true } },
      order: true,
    },
  });
}

/**
 * Mints a link for the order this teammate is holding.
 *
 * Only the teammate actually assigned may offer it, and only while the
 * session has not started. Making a new link puts out the previous one: two
 * live links on one order would let two people accept the same handover, and
 * the loser would have clicked Accept on an order that was never theirs.
 */
export async function createHandover(orderId: string, fromTeammateId: string, note?: string | null) {
  const now = new Date();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { candidates: { where: { teammateId: fromTeammateId } } },
  });
  if (!order) throw new Error("Unknown order.");

  const mine = order.candidates[0];
  if (!mine?.selected) throw new Error("You are not assigned to this order.");
  if (order.status !== "ASSIGNED") throw new Error("This order can no longer be handed over.");
  if ((order.sessionStatus ?? "WAITING_FOR_INVITE") !== "WAITING_FOR_INVITE") {
    throw new Error("The session has already started — it can't be handed over now.");
  }

  const handover = await prisma.$transaction(async (tx) => {
    await tx.orderHandover.updateMany({
      where: { orderId, fromTeammateId, acceptedAt: null, declinedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    return tx.orderHandover.create({
      data: {
        token: newHandoverToken(),
        orderId,
        fromTeammateId,
        note: note?.trim() || null,
        expiresAt: new Date(now.getTime() + HANDOVER_TTL_MS),
      },
    });
  });

  await logDispatch(prisma, orderId, DISPATCH_EVENT.ADMIN, "A handover link was created for this order.", {
    teammateId: fromTeammateId,
    detail: { handoverId: handover.id, note: handover.note },
  });

  return handover;
}

/** Puts out a live link without anyone having answered it. */
export async function revokeHandover(handoverId: string, fromTeammateId: string) {
  await prisma.orderHandover.updateMany({
    where: { id: handoverId, fromTeammateId, acceptedAt: null, declinedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function declineHandover(token: string, toTeammateId: string) {
  const now = new Date();
  const handover = await prisma.orderHandover.findUnique({ where: { token }, include: { order: true } });
  if (!handover) throw new Error("Unknown handover.");
  if (handoverState(handover, now) !== "open") throw new Error("This handover is no longer open.");

  await prisma.orderHandover.update({
    where: { id: handover.id },
    data: { declinedAt: now, toTeammateId },
  });
  await logDispatch(prisma, handover.orderId, DISPATCH_EVENT.DECLINED, "A handover offer was declined.", {
    teammateId: toTeammateId,
  });

  const [from, to] = await Promise.all([
    prisma.teammate.findUnique({ where: { id: handover.fromTeammateId }, select: { userId: true } }),
    prisma.teammate.findUnique({ where: { id: toTeammateId }, select: { name: true } }),
  ]);
  if (from?.userId) {
    await notifyUser(from.userId, {
      type: "order.handover.declined",
      title: "Your handover was declined",
      body: `${to?.name ?? "They"} turned down order #${handover.order.orderNo}. It is still yours.`,
      href: `/dashboard/teammate/session/${handover.orderId}`,
    });
  }
}

/**
 * Moves the assignment across.
 *
 * Everything that decides the outcome is re-read inside the transaction off
 * the stored rows: the link's state, the offerer still holding the order, and
 * the recipient's eligibility. A link that was open when the page rendered
 * can have been overtaken by the session starting, by the customer
 * cancelling, or by the offerer minting a newer one, and the accept has to
 * lose in all three cases rather than assign an order out from under someone.
 */
export async function acceptHandover(token: string, toTeammateId: string) {
  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      const handover = await tx.orderHandover.findUnique({
        where: { token },
        include: { order: { include: { candidates: true } } },
      });
      if (!handover) throw new Error("Unknown handover.");
      if (handoverState(handover, now) !== "open") throw new Error("This handover is no longer open.");
      if (handover.fromTeammateId === toTeammateId) throw new Error("This order is already yours.");

      const order = handover.order;
      const outgoing = order.candidates.find((c) => c.teammateId === handover.fromTeammateId);
      if (!outgoing?.selected) throw new Error("Whoever offered this is no longer on the order.");

      const eligible = await handoverEligibility(tx, toTeammateId, order, now);
      if (!eligible.ok) throw new Error(eligible.reason);

      // The outgoing teammate keeps their candidate row — the dispatch history
      // is the record of who was invited and what they did, and they did
      // accept. What moves is the selection, which is what creditOrderPayout
      // reads at completion, so the payout follows on its own.
      await tx.dispatchCandidate.update({
        where: { id: outgoing.id },
        data: { selected: false, isPrimary: false, selectedAt: null },
      });

      // Upsert for the same reason inviteAll does: the recipient may already
      // hold a row on this order from a wave they let time out.
      await tx.dispatchCandidate.upsert({
        where: { orderId_teammateId: { orderId: order.id, teammateId: toTeammateId } },
        create: {
          orderId: order.id,
          teammateId: toTeammateId,
          status: "ACCEPTED",
          invitedAt: now,
          respondedAt: now,
          selected: true,
          selectedAt: now,
          isPrimary: outgoing.isPrimary,
          manual: true,
          wave: outgoing.wave,
        },
        update: {
          status: "ACCEPTED",
          respondedAt: now,
          expiresAt: null,
          selected: true,
          selectedAt: now,
          isPrimary: outgoing.isPrimary,
          manual: true,
        },
      });

      // The conversation is keyed by order *and* teammate (chatStore.ts), so
      // without this the customer's thread would empty itself the moment the
      // handover landed and the incoming teammate would start blind. The
      // thread belongs to the session, not to whoever is holding it, so it
      // moves across with the assignment. Bubbles keep their own senderName,
      // so what the previous teammate wrote stays under their name.
      await tx.conversationMessage.updateMany({
        where: { conversationKey: `${order.id}::${handover.fromTeammateId}` },
        data: { conversationKey: `${order.id}::${toTeammateId}` },
      });

      await tx.teammate.update({ where: { id: toTeammateId }, data: { lastAssignedAt: now } });
      await tx.orderHandover.update({
        where: { id: handover.id },
        data: { acceptedAt: now, toTeammateId },
      });

      const [from, to] = await Promise.all([
        tx.teammate.findUnique({ where: { id: handover.fromTeammateId }, select: { name: true, userId: true } }),
        tx.teammate.findUnique({ where: { id: toTeammateId }, select: { name: true, userId: true } }),
      ]);

      // Said in the thread itself, because the thread just changed hands and
      // the customer is looking at a stranger answering under a name that was
      // not there a minute ago.
      await tx.conversationMessage.create({
        data: {
          conversationKey: `${order.id}::${toTeammateId}`,
          sender: "admin",
          senderName: "Admin",
          text: `${to?.name ?? "A new teammate"} has taken over this session from ${from?.name ?? "the previous teammate"}.`,
          readBy: ["admin"],
        },
      });

      await logDispatch(
        tx,
        order.id,
        DISPATCH_EVENT.ASSIGNED,
        `Order handed over from ${from?.name ?? "a teammate"} to ${to?.name ?? "a teammate"}.`,
        { teammateId: toTeammateId, detail: { handoverId: handover.id, from: handover.fromTeammateId } },
      );

      return { order, from, to };
    },
    { isolationLevel: "Serializable" },
  );

  // Outside the transaction: these reach for the network, and none of them may
  // hold the assignment open or undo it by failing.
  const { order, from, to } = result;

  if (order.clientUserId) {
    await notifyUser(order.clientUserId, {
      type: "order.handover",
      title: "Your teammate changed",
      body: `${to?.name ?? "A new teammate"} has taken over your ${order.gameName} session from ${from?.name ?? "your previous teammate"}.`,
      href: `/order/${order.accessToken}`,
    });
  }
  if (to?.userId) {
    await notifyUser(to.userId, {
      type: "order.assigned",
      title: "You picked up a session",
      body: `Order #${order.orderNo} — ${order.gameName} · ${order.option} is yours.`,
      href: `/dashboard/teammate/session/${order.id}`,
    });
  }
  if (from?.userId) {
    await notifyUser(from.userId, {
      type: "order.handover.accepted",
      title: "Your handover was accepted",
      body: `${to?.name ?? "Another teammate"} has taken order #${order.orderNo}.`,
      href: "/dashboard/teammate",
    });
  }

  await publishOrderChange(order.id);
  return order;
}
