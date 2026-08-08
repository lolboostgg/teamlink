import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { notifyUser, notifyAdmins } from "@/lib/notifications/service";
import { payoutForOrder } from "@/lib/payoutSplit";
import { publish } from "@/lib/events/bus";
import { issueSessionRewardCoupon } from "@/lib/couponsServer";
import { notifyTeammateAssigned } from "@/lib/notify/orderNotifications";

/**
 * Server-authoritative dispatch rules. Every transition that decides who
 * gets an order runs here inside a transaction — the browser can ask, but
 * it never decides. Replaces the localStorage simulation in
 * lib/matchmaking/store.ts for the teammate side.
 */

export const MAX_CANDIDATES = 5;
export const DISPATCH_WINDOW_MS = 60_000;
export const SELECTION_WINDOW_MS = 60_000;

/**
 * A grace period at the top of the search during which acceptances are
 * recorded but the customer's picker stays shut. It buys the customer time to
 * set their preferences (vibe, conversation, play style) on the searching
 * screen before the screen changes under them. Teammates are unaffected —
 * they see the request the instant it is dispatched.
 */
export const PICKER_REVEAL_DELAY_MS = 20_000;

/** Whether an order is past its reveal delay. Orders that were never
 * dispatched have no delay to serve. */
export function pickerRevealed(dispatchedAt: Date | null, now: Date): boolean {
  if (!dispatchedAt) return true;
  return dispatchedAt.getTime() + PICKER_REVEAL_DELAY_MS <= now.getTime();
}

/**
 * How long an order may sit assigned with nothing happening before it's given
 * up on.
 *
 * A teammate who accepts and then never shows leaves the customer waiting on a
 * session that will not start, and leaves themselves counted as busy — so no
 * later order can reach them either. Past this, the order is cancelled and the
 * customer gets what they paid back as store credit.
 */
export const ABANDONED_ASSIGNMENT_MS = 2 * 60 * 60 * 1000;

export class DispatchError extends Error {}

/**
 * Moves an order forward by whatever the clock has decided since the last
 * read: expiring unanswered invites, opening the selection window, and
 * auto-selecting the first acceptor when the customer runs out of time.
 * Idempotent, so it's safe to call on every read.
 */
/**
 * Announces that an order moved, so the client's matching screen and the
 * teammates' dispatch panels update now instead of on their next poll.
 * Addressed to the people actually on the order plus every admin; never
 * throws, since a missed notification must not fail the transition.
 */
async function publishOrderChange(orderId: string) {
  try {
    const [order, admins] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        select: {
          clientUserId: true,
          // Every invited teammate, not only the selected ones — a candidate
          // whose invite just expired needs to see that too.
          candidates: { select: { teammate: { select: { userId: true } } } },
        },
      }),
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
    ]);

    const userIds = new Set<string>(admins.map((admin) => admin.id));
    if (order?.clientUserId) userIds.add(order.clientUserId);
    for (const candidate of order?.candidates ?? []) {
      if (candidate.teammate.userId) userIds.add(candidate.teammate.userId);
    }

    const audience = [...userIds];
    await publish({ topic: "orders", key: orderId, userIds: audience });
    await publish({ topic: "dispatch", key: orderId, userIds: audience });
  } catch {
    // Best-effort: the polling fallback still catches this change.
  }
}

/**
 * Gives up on an assignment nobody ever turned into a session: the order is
 * cancelled and the customer's money comes back as store credit.
 *
 * Credit rather than a card refund because it is the same balance every
 * payment method already settles into, and it lets the customer rebook
 * immediately — which is what they wanted in the first place. A guest order
 * has no account to credit, so it is only cancelled and left to an admin.
 */
async function abandonAssignment(
  tx: Prisma.TransactionClient,
  order: { id: string; orderNo: number; clientUserId: string | null; priceEUR: unknown },
) {
  const cents = Math.round(Number(order.priceEUR) * 100);
  if (order.clientUserId && cents > 0) {
    await tx.user.update({
      where: { id: order.clientUserId },
      data: { creditBalanceCents: { increment: cents } },
    });
    await tx.creditTransaction.create({
      data: {
        userId: order.clientUserId,
        type: "REFUND",
        amountCents: cents,
        note: `Order #${order.orderNo} — the session never started`,
      },
    });
  }
  return tx.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED", sessionStatus: null },
  });
}

export async function reconcileOrder(orderId: string) {
  const now = new Date();

  // Captured from the transaction's own read so the clock-driven transitions
  // can be announced without paying for a second query on every reconcile —
  // and this runs on every order read.
  let previousStatus: string | null = null;
  let abandoned: { orderNo: number; gameName: string; clientUserId: string | null; priceEUR: number } | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { candidates: true } });
    if (!order) return null;
    previousStatus = order.status;

    // Assigned, but the session never started and no game was ever submitted.
    // Only ASSIGNED: once a teammate is in-game there is real work in flight,
    // and that is not something a clock should throw away.
    if (
      order.status === "ASSIGNED" &&
      order.assignedAt &&
      order.assignedAt.getTime() + ABANDONED_ASSIGNMENT_MS <= now.getTime() &&
      (await tx.sessionGame.count({ where: { orderId } })) === 0
    ) {
      abandoned = {
        orderNo: order.orderNo,
        gameName: order.gameName,
        clientUserId: order.clientUserId,
        priceEUR: Number(order.priceEUR),
      };
      return abandonAssignment(tx, order);
    }

    // AWAITING_PAYMENT has no dispatch window running yet — the clock only
    // starts when the payment releases it, so it must not age out here.
    if (["AWAITING_PAYMENT", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_MATCH"].includes(order.status)) {
      return order;
    }

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

    // The customer sets vibe, conversation and play style on the searching
    // screen; a teammate answering in the first couple of seconds used to
    // yank that screen away mid-choice. So the picker is held shut for a
    // short beat after dispatch — the invitations still go out at once and
    // acceptances still land, they just aren't acted on yet. Held here
    // rather than hidden in the customer view on purpose: the selection
    // window has to start when the customer can actually see the picker,
    // not while it is still closed.
    const revealed = pickerRevealed(order.dispatchedAt, now);

    if (order.status === "SEARCHING" || order.status === "CANDIDATES_READY") {
      // The first acceptance opens the picker immediately. Other pending
      // invitees remain eligible and may continue filling the five slots.
      if (accepted.length > 0 && revealed) {
        return tx.order.update({
          where: { id: orderId },
          data: { status: "SELECTING", selectionDeadline: new Date(now.getTime() + SELECTION_WINDOW_MS) },
        });
      }
      // Only when nobody took it. Without the accepted check, an order whose
      // invitees had all answered before the reveal would count as settled
      // and be written off as NO_MATCH despite having a teammate waiting.
      if (settled && accepted.length === 0) {
        return tx.order.update({
          where: { id: orderId },
          data: { status: order.isReplay ? "CANCELLED" : "NO_MATCH" },
        });
      }
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

  if (abandoned) await announceAbandonedOrder(orderId, abandoned);

  if (result && previousStatus !== null && result.status !== previousStatus) {
    await publishOrderChange(orderId);

    // Auto-select fired: the selection window ran out, which almost always
    // means the customer isn't looking at the page. Mail them. A customer who
    // picked for themselves is by definition already on the screen and needs
    // no mail, so the other assignment paths deliberately stay quiet. The
    // status comparison is also what keeps this to one mail — a later
    // reconcile sees ASSIGNED on both sides and does nothing.
    if (previousStatus === "SELECTING" && result.status === "ASSIGNED") {
      void notifyTeammateAssigned(orderId);
    }
  }
  return result;
}

/** Tells the customer where their money went, and the admins that it happened. */
async function announceAbandonedOrder(
  orderId: string,
  order: { orderNo: number; gameName: string; clientUserId: string | null; priceEUR: number },
) {
  const amount = `€${order.priceEUR.toFixed(2)}`;
  if (order.clientUserId) {
    await notifyUser(order.clientUserId, {
      type: "order.abandoned",
      title: "Your session never started",
      body: `Order #${order.orderNo} was cancelled and ${amount} is back in your balance as credit.`,
      href: "/dashboard/client/wallet",
    });
  }
  await notifyAdmins({
    type: "order.abandoned",
    title: `Order abandoned · ${order.gameName}`,
    body: `#${order.orderNo} sat assigned without a session${order.clientUserId ? ` — ${amount} credited` : " — guest order, nothing credited"}.`,
    href: `/dashboard/admin/orders/${orderId}`,
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
  // Guarded rather than assumed: the line below indexes [0], and an empty
  // list would hand Prisma an undefined id, throw inside the transaction,
  // and surface as a 500 on the customer's order read — which is not what a
  // "nobody to assign" situation should look like from the outside.
  if (candidateIds.length === 0) return;

  const winners = await tx.dispatchCandidate.findMany({
    where: { id: { in: candidateIds } },
    select: { teammateId: true },
  });
  await tx.dispatchCandidate.updateMany({
    where: { id: { in: candidateIds } },
    data: { selected: true, selectedAt: now },
  });
  await tx.dispatchCandidate.update({ where: { id: candidateIds[0] }, data: { isPrimary: true } });
  await tx.order.update({
    where: { id: orderId },
    data: { status: "ASSIGNED", assignedAt: now, sessionStatus: "WAITING_FOR_INVITE" },
  });
  await tx.teammate.updateMany({
    where: { id: { in: winners.map((winner) => winner.teammateId) } },
    data: { lastAssignedAt: now },
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

  const responded = await prisma.$transaction(
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
      if (!["SEARCHING", "CANDIDATES_READY", "SELECTING"].includes(candidate.order.status)) {
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
      const favorite = candidate.order.clientUserId
        ? await tx.favoriteTeammate.findUnique({
            where: { clientUserId_teammateId: { clientUserId: candidate.order.clientUserId, teammateId } },
            select: { teammateId: true },
          })
        : null;
      // Replay requests are exclusive to the previous teammate. Their
      // acceptance is the selection, so the customer never sees a five-slot picker.
      // A favorite gets the same atomic fast path on a single-slot order.
      if (candidate.order.requestedTeammateId === teammateId || (favorite && candidate.order.teammatesRequested === 1)) {
        await assignWinners(tx, orderId, [candidate.id], now);
        await notifySelected(tx, [teammateId], candidate.order.gameName, orderId);
      } else if (candidate.order.status !== "SELECTING" && pickerRevealed(candidate.order.dispatchedAt, now)) {
        // Inside the reveal delay the acceptance is recorded but the picker
        // stays shut; reconcileOrder opens it the moment the delay is up.
        await tx.order.update({
          where: { id: orderId },
          data: { status: "SELECTING", selectionDeadline: new Date(now.getTime() + SELECTION_WINDOW_MS) },
        });
      }
      return accepted;
    },
    { isolationLevel: "Serializable" },
  );

  await publishOrderChange(orderId);
  return responded;
}

/** Releases an accepted candidate slot while the customer is still choosing. */
export async function withdrawDispatchAcceptance(orderId: string, teammateId: string) {
  const now = new Date();
  const withdrawn = await prisma.$transaction(async (tx) => {
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
    if (remaining.length === 0 && candidate.order.status === "SELECTING") {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANDIDATES_READY", selectionDeadline: null },
      });
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx.dispatchCandidate.update({
        where: { id: remaining[i].id },
        data: { candidatePosition: i + 1, isAutoSelect: i === 0 },
      });
    }
  });

  await publishOrderChange(orderId);
  return withdrawn;
}

/** The customer picking. Only accepted candidates of a SELECTING order qualify. */
export async function selectTeammates(orderId: string, teammateIds: string[]) {
  const now = new Date();

  const picked = await prisma.$transaction(
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

  await publishOrderChange(orderId);
  return picked;
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
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      sessionStatus: status,
      status: status === "IN_GAME" ? "IN_PROGRESS" : undefined,
    },
  });
  await publishOrderChange(orderId);
  return updated;
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
    await publishOrderChange(orderId);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new DispatchError("That game was already submitted.");
    }
    throw err;
  }
}

export async function deleteRecordedGame(orderId: string, teammateId: string, gameNumber: number) {
  await assertAssignedTeammate(orderId, teammateId);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "COMPLETED") throw new DispatchError("This order can no longer be edited.");
  const game = await prisma.sessionGame.findUnique({ where: { orderId_gameNumber: { orderId, gameNumber } } });
  if (!game) throw new DispatchError("That game result no longer exists.");
  await prisma.sessionGame.delete({ where: { id: game.id } });
  if (game.proofPath) {
    const { deletePrivateFile } = await import("@/lib/storage");
    await deletePrivateFile(game.proofPath, "proofs").catch(() => undefined);
  }
  await publishOrderChange(orderId);
}

/**
 * Books the teammates' share of a completed order into the earnings ledger
 * and moves their balances.
 *
 * The order's `teammatePayoutEUR` is the whole pot (half the price), split
 * evenly across everyone who actually played it — not 50% per head, which on
 * a three-teammate order would pay out more than the customer paid. Rounding
 * remainders go to the primary so the shares always add back up to the pot.
 *
 * Idempotent: the ledger's unique (teammateId, orderId, ORDER_PAYOUT) index
 * means a replayed completion credits nobody twice, and we skip rows that are
 * already there so the balance isn't moved either.
 */
async function creditOrderPayout(tx: Prisma.TransactionClient, order: { id: string; priceEUR: unknown; teammatePayoutEUR: unknown }) {
  const selected = await tx.dispatchCandidate.findMany({
    where: { orderId: order.id, selected: true },
    select: { teammateId: true, isPrimary: true },
    orderBy: { isPrimary: "desc" },
  });
  if (selected.length === 0) return;

  const alreadyPaid = new Set(
    (
      await tx.teammateEarning.findMany({
        where: { orderId: order.id, type: "ORDER_PAYOUT" },
        select: { teammateId: true },
      })
    ).map((row) => row.teammateId),
  );

  // Split in whole cents so nothing evaporates in floating point.
  const potCents = Math.round(payoutForOrder(order) * 100);
  const baseCents = Math.floor(potCents / selected.length);
  let remainder = potCents - baseCents * selected.length;

  for (const candidate of selected) {
    const cents = baseCents + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    if (alreadyPaid.has(candidate.teammateId) || cents === 0) continue;

    const amountEUR = new Prisma.Decimal(cents).dividedBy(100);
    await tx.teammateEarning.create({
      data: { teammateId: candidate.teammateId, orderId: order.id, type: "ORDER_PAYOUT", amountEUR },
    });
    await tx.teammate.update({
      where: { id: candidate.teammateId },
      data: { balanceEUR: { increment: amountEUR } },
    });
  }
}

export async function completeOrder(orderId: string, teammateId: string, farewell?: string) {
  await assertAssignedTeammate(orderId, teammateId);

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { games: true } });
  if (!order) throw new DispatchError("Unknown order.");
  if (order.status === "COMPLETED") throw new DispatchError("This order is already closed.");
  if (order.games.length < order.gamesBooked) {
    throw new DispatchError(`Submit all ${order.gamesBooked} booked game results first.`);
  }

  // Closing the order and paying for it are one atomic step. If the ledger
  // write fails, the order must not end up COMPLETED with nobody credited.
  const completed = await prisma.$transaction(async (tx) => {
    const closed = await tx.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", sessionStatus: "ORDER_COMPLETED", sessionCompleteAt: new Date() },
    });

    await tx.teammate.update({
      where: { id: teammateId },
      data: { available: true, availableSince: new Date(), lastSeenAt: new Date(), sessionsCount: { increment: 1 } },
    });

    await creditOrderPayout(tx, closed);
    return closed;
  });

  // The "10% off next time" code used to be minted in the browser when the
  // session-complete screen rendered. Earning it is a server-side fact now,
  // so it exists whether or not the customer ever opens that screen.
  await issueSessionRewardCoupon(orderId, completed.clientUserId);

  if (completed.clientUserId) {
    await notifyUser(completed.clientUserId, {
      type: "order.completed",
      title: "Your session is complete",
      body: (farewell ?? "GG!").trim().slice(0, 80) || "GG!",
      href: `/checkout/matching?order=${orderId}`,
    });
  }
  await notifyAdmins({
    type: "order.completed",
    title: `Order completed · ${completed.gameName}`,
    body: `${completed.option} — payout is pending review.`,
    href: "/dashboard/admin/payouts",
  });

  await publishOrderChange(orderId);
  return completed;
}

/**
 * Invites a teammate to orders that are already searching.
 *
 * The invite wave is picked once, at dispatch, from whoever happened to be
 * online at that second. Someone who opens their panel ten seconds later used
 * to see nothing at all until the next order — which is worst exactly when the
 * roster is thin and the customer is the one waiting. Called on every teammate
 * panel read, so coming online is enough to be considered.
 *
 * Returns the order ids the teammate was newly invited to.
 */
export async function inviteToRunningOrders(teammateId: string): Promise<string[]> {
  const now = new Date();

  const teammate = await prisma.teammate.findUnique({ where: { id: teammateId } });
  if (!teammate || !teammate.available) return [];

  // Anyone already committed elsewhere stays out — the same rule the initial
  // wave applies, so a teammate can't be pulled onto two orders at once.
  const busy = await prisma.dispatchCandidate.findFirst({
    where: {
      teammateId,
      OR: [
        { selected: true, order: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } },
        { status: "ACCEPTED", order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } } },
      ],
    },
    select: { id: true },
  });
  if (busy) return [];

  const gameSlugs = (teammate.gameSlugs as string[] | null) ?? [];
  if (gameSlugs.length === 0) return [];

  const open = await prisma.order.findMany({
    where: {
      status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] },
      dispatchDeadline: { gt: now },
      gameSlug: { in: gameSlugs },
      // A replay request belongs to the one teammate it names; nobody else
      // gets pulled into it.
      OR: [{ requestedTeammateId: null }, { requestedTeammateId: teammateId }],
      candidates: { none: { teammateId } },
    },
    include: { candidates: { select: { id: true } } },
    orderBy: { dispatchedAt: "asc" },
  });

  const invited: string[] = [];

  for (const order of open) {
    if (order.candidates.length >= MAX_CANDIDATES) continue;

    try {
      await prisma.dispatchCandidate.create({
        data: {
          orderId: order.id,
          teammateId,
          invitedAt: now,
          expiresAt: order.dispatchDeadline,
        },
      });
    } catch {
      // Unique on (orderId, teammateId): a concurrent panel read got there
      // first, which is a no-op rather than an error.
      continue;
    }

    invited.push(order.id);
    // One order at a time. Two requests appearing at once would have the
    // teammate accept one and lose the other anyway, and the busy check above
    // will keep them out of the rest until this one resolves.
    break;
  }

  if (invited.length > 0) {
    await prisma.teammate.update({ where: { id: teammateId }, data: { lastDispatchAt: now } });
    if (teammate.userId) {
      for (const orderId of invited) {
        await publish({ topic: "dispatch", key: orderId, userIds: [teammate.userId] });
      }
    }
  }

  return invited;
}

/** Everything the teammate dashboard needs in one read. */
export async function getTeammateDispatchView(teammateId: string) {
  // Before reading, offer this teammate anything already searching. The invite
  // wave is picked at dispatch from whoever was online that second, so without
  // this a teammate who opens their panel mid-search sees an empty screen while
  // a customer is actively waiting for someone exactly like them.
  await inviteToRunningOrders(teammateId).catch((err) => {
    console.error("[dispatch] top-up invite failed:", teammateId, err);
  });

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
