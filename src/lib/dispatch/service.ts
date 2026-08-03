import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { notifyUser, notifyAdmins } from "@/lib/notifications/service";

/**
 * Server-authoritative dispatch rules. Every transition that decides who
 * gets an order runs here inside a transaction — the browser can ask, but
 * it never decides. Replaces the localStorage simulation in
 * lib/matchmaking/store.ts for the teammate side.
 */

export const MAX_CANDIDATES = 5;
export const DISPATCH_WINDOW_MS = 60_000;
export const SELECTION_WINDOW_MS = 60_000;

export class DispatchError extends Error {}

/**
 * Moves an order forward by whatever the clock has decided since the last
 * read: expiring unanswered invites, opening the selection window, and
 * auto-selecting the first acceptor when the customer runs out of time.
 * Idempotent, so it's safe to call on every read.
 */
export async function reconcileOrder(orderId: string) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { candidates: true } });
    if (!order) return null;

    if (["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_MATCH"].includes(order.status)) return order;

    // Invites nobody answered in time.
    await tx.dispatchCandidate.updateMany({
      where: { orderId, status: "PENDING", expiresAt: { lte: now } },
      data: { status: "TIMED_OUT", respondedAt: now },
    });

    const candidates = await tx.dispatchCandidate.findMany({ where: { orderId } });
    const accepted = candidates
      .filter((c) => c.status === "ACCEPTED")
      .sort((a, b) => (a.respondedAt?.getTime() ?? 0) - (b.respondedAt?.getTime() ?? 0));
    const settled = candidates.every((c) => c.status !== "PENDING") || order.dispatchDeadline <= now;

    if ((order.status === "SEARCHING" || order.status === "CANDIDATES_READY") && settled) {
      if (accepted.length === 0) {
        return tx.order.update({
          where: { id: orderId },
          data: { status: order.isReplay ? "CANCELLED" : "NO_MATCH" },
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: { status: "SELECTING", selectionDeadline: new Date(now.getTime() + SELECTION_WINDOW_MS) },
      });
    }

    // Customer let the timer run out — the auto-select candidate gets it.
    if (order.status === "SELECTING" && order.selectionDeadline && order.selectionDeadline <= now) {
      const winners = accepted.slice(0, Math.max(1, order.teammatesRequested));
      if (winners.length === 0) {
        return tx.order.update({ where: { id: orderId }, data: { status: "NO_MATCH" } });
      }
      await assignWinners(tx, orderId, winners.map((w) => w.id), now);
      return tx.order.findUnique({ where: { id: orderId } });
    }

    return order;
  });
}

/** Tells the picked teammates the order is theirs. */
async function notifySelected(
  tx: Prisma.TransactionClient,
  teammateIds: string[],
  gameName: string,
  orderId: string,
) {
  const teammates = await tx.teammate.findMany({
    where: { id: { in: teammateIds }, userId: { not: null } },
    select: { userId: true },
  });
  if (teammates.length === 0) return;

  await tx.notification.createMany({
    data: teammates.map((t) => ({
      userId: t.userId as string,
      type: "order.assigned",
      title: "You've been selected",
      body: `The customer picked you for ${gameName}.`,
      href: `/dashboard/teammate/session/${orderId}`,
    })),
  });
}

async function assignWinners(
  tx: Prisma.TransactionClient,
  orderId: string,
  candidateIds: string[],
  now: Date,
) {
  await tx.dispatchCandidate.updateMany({
    where: { id: { in: candidateIds } },
    data: { selected: true, selectedAt: now },
  });
  await tx.dispatchCandidate.update({ where: { id: candidateIds[0] }, data: { isPrimary: true } });
  await tx.order.update({
    where: { id: orderId },
    data: { status: "ASSIGNED", assignedAt: now, sessionStatus: "WAITING_FOR_INVITE" },
  });
}

/**
 * A teammate answering their invite. The accept path is the one place a
 * race actually matters: two teammates hitting Accept at the same instant
 * must not both become candidate #1, and the sixth acceptor must not get a
 * slot at all. Both are settled inside the transaction off the stored rows,
 * not off anything the client sent.
 */
export async function respondToDispatch(orderId: string, teammateId: string, accept: boolean) {
  const now = new Date();

  return prisma.$transaction(
    async (tx) => {
      const candidate = await tx.dispatchCandidate.findUnique({
        where: { orderId_teammateId: { orderId, teammateId } },
        include: { order: true },
      });
      if (!candidate) throw new DispatchError("You weren't invited to this order.");
      if (candidate.status !== "PENDING") throw new DispatchError("You already answered this request.");
      if (candidate.expiresAt && candidate.expiresAt <= now) {
        await tx.dispatchCandidate.update({
          where: { id: candidate.id },
          data: { status: "TIMED_OUT", respondedAt: now },
        });
        throw new DispatchError("That request expired.");
      }
      if (!["SEARCHING", "CANDIDATES_READY"].includes(candidate.order.status)) {
        throw new DispatchError("This order is no longer taking candidates.");
      }

      if (!accept) {
        return tx.dispatchCandidate.update({
          where: { id: candidate.id },
          data: { status: "DECLINED", respondedAt: now, manual: true },
        });
      }

      // A teammate already playing or already waiting on another customer's
      // pick can't take a second order.
      const busy = await tx.dispatchCandidate.findFirst({
        where: {
          teammateId,
          orderId: { not: orderId },
          OR: [
            { selected: true, order: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } },
            { status: "ACCEPTED", order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } } },
          ],
        },
      });
      if (busy) throw new DispatchError("You already have an order in progress.");

      const acceptedCount = await tx.dispatchCandidate.count({ where: { orderId, status: "ACCEPTED" } });
      if (acceptedCount >= MAX_CANDIDATES) throw new DispatchError("The candidate slots are already full.");

      const accepted = await tx.dispatchCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "ACCEPTED",
          respondedAt: now,
          manual: true,
          candidatePosition: acceptedCount + 1,
          isAutoSelect: acceptedCount === 0,
        },
      });
      // Replay requests are exclusive to the previous teammate. Their
      // acceptance is the selection, so the customer never sees a five-slot picker.
      if (candidate.order.requestedTeammateId === teammateId) {
        await assignWinners(tx, orderId, [candidate.id], now);
      }
      return accepted;
    },
    { isolationLevel: "Serializable" },
  );
}

/** Releases an accepted candidate slot while the customer is still choosing. */
export async function withdrawDispatchAcceptance(orderId: string, teammateId: string) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.dispatchCandidate.findUnique({
      where: { orderId_teammateId: { orderId, teammateId } },
      include: { order: true },
    });
    if (!candidate || candidate.status !== "ACCEPTED" || candidate.selected) {
      throw new DispatchError("This acceptance can no longer be withdrawn.");
    }
    if (!["SEARCHING", "CANDIDATES_READY", "SELECTING"].includes(candidate.order.status)) {
      throw new DispatchError("The customer has already finished choosing.");
    }
    await tx.dispatchCandidate.update({
      where: { id: candidate.id },
      data: { status: "DECLINED", respondedAt: now, candidatePosition: null, isAutoSelect: false },
    });
    const remaining = await tx.dispatchCandidate.findMany({
      where: { orderId, status: "ACCEPTED" },
      orderBy: { respondedAt: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.dispatchCandidate.update({
        where: { id: remaining[i].id },
        data: { candidatePosition: i + 1, isAutoSelect: i === 0 },
      });
    }
  });
}

/** The customer picking. Only accepted candidates of a SELECTING order qualify. */
export async function selectTeammates(orderId: string, teammateIds: string[]) {
  const now = new Date();

  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { candidates: true } });
      if (!order) throw new DispatchError("Unknown order.");
      if (order.status !== "SELECTING") throw new DispatchError("This order isn't waiting for a pick.");

      const eligible = order.candidates.filter((c) => c.status === "ACCEPTED" && teammateIds.includes(c.teammateId));
      if (eligible.length === 0) throw new DispatchError("That teammate isn't available for this order.");

      await assignWinners(tx, orderId, eligible.slice(0, Math.max(1, order.teammatesRequested)).map((c) => c.id), now);
      const assigned = await tx.order.findUnique({ where: { id: orderId }, include: { candidates: true } });
      await notifySelected(tx, eligible.map((c) => c.teammateId), order.gameName, orderId);
      return assigned;
    },
    { isolationLevel: "Serializable" },
  );
}

/** Guard for the order room: only a selected teammate may read or write it. */
export async function assertAssignedTeammate(orderId: string, teammateId: string) {
  const candidate = await prisma.dispatchCandidate.findUnique({
    where: { orderId_teammateId: { orderId, teammateId } },
  });
  if (!candidate?.selected) throw new DispatchError("This order isn't assigned to you.");
  return candidate;
}

export async function setSessionStatus(orderId: string, teammateId: string, status: string) {
  await assertAssignedTeammate(orderId, teammateId);
  return prisma.order.update({
    where: { id: orderId },
    data: {
      sessionStatus: status,
      status: status === "IN_GAME" ? "IN_PROGRESS" : undefined,
    },
  });
}

/**
 * Records a finished game. The unique (orderId, gameNumber) index is what
 * actually stops a double submit — two clicks land as one row plus an error,
 * not two games.
 */
export async function recordGame(
  orderId: string,
  teammateId: string,
  game: { gameNumber: number; result: string; note?: string; proofPath?: string | null; proofName?: string | null },
) {
  await assertAssignedTeammate(orderId, teammateId);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new DispatchError("Unknown order.");
  if (order.status === "COMPLETED") throw new DispatchError("This order is already closed.");
  // Re-checked here, not just in the modal — the action is reachable
  // without the UI.
  if (["WIN", "LOSS"].includes(game.result) && !game.proofPath) {
    throw new DispatchError("A result screenshot is required for a played game.");
  }

  try {
    return await prisma.$transaction([
      prisma.sessionGame.create({
        data: {
          orderId,
          gameNumber: game.gameNumber,
          result: game.result,
          note: game.note?.slice(0, 300) || null,
          proofPath: game.proofPath ?? null,
          proofName: game.proofName ?? null,
        },
      }),
      prisma.order.update({ where: { id: orderId }, data: { sessionStatus: "WAITING_FOR_NEXT_GAME" } }),
    ]);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new DispatchError("That game was already submitted.");
    }
    throw err;
  }
}

export async function completeOrder(orderId: string, teammateId: string) {
  await assertAssignedTeammate(orderId, teammateId);

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { games: true } });
  if (!order) throw new DispatchError("Unknown order.");
  if (order.status === "COMPLETED") throw new DispatchError("This order is already closed.");
  if (order.games.length < order.gamesBooked) {
    throw new DispatchError(`Submit all ${order.gamesBooked} booked game results first.`);
  }

  const completed = await prisma.order.update({
    where: { id: orderId },
    data: { status: "COMPLETED", sessionStatus: "ORDER_COMPLETED", sessionCompleteAt: new Date() },
  });

  if (completed.clientUserId) {
    await notifyUser(completed.clientUserId, {
      type: "order.completed",
      title: "Your session is complete",
      body: `${completed.gameName} · ${completed.option}`,
      href: `/checkout/matching?order=${orderId}`,
    });
  }
  await notifyAdmins({
    type: "order.completed",
    title: `Order completed · ${completed.gameName}`,
    body: `${completed.option} — payout is pending review.`,
    href: "/dashboard/admin/payouts",
  });

  return completed;
}

/** Everything the teammate dashboard needs in one read. */
export async function getTeammateDispatchView(teammateId: string) {
  const rows = await prisma.dispatchCandidate.findMany({
    where: {
      teammateId,
      order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING", "ASSIGNED", "IN_PROGRESS"] } },
    },
    include: { order: { include: { candidates: true, games: true } } },
    orderBy: { invitedAt: "desc" },
  });

  // Cheap catch-up: the clock-driven transitions only need to happen when
  // somebody actually looks, and there's no scheduler in this deployment.
  for (const row of rows) await reconcileOrder(row.orderId);

  return prisma.dispatchCandidate.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { order: { include: { candidates: true, games: true } } },
    orderBy: { invitedAt: "desc" },
  });
}
