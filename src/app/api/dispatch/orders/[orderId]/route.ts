import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { reconcileOrder, selectTeammates, DispatchError } from "@/lib/dispatch/service";
import { toCustomerOrder } from "@/lib/dispatch/customerView";
import { settleCancelledOrder } from "@/lib/orderRefunds";
import { publish } from "@/lib/events/bus";

export const dynamic = "force-dynamic";

const include = { candidates: true, review: true, games: true } as const;

/** Compares two secrets without leaking their contents through timing. */
function tokenMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Decides whether the caller may read or act on this order.
 *
 * Until this existed there was no check at all: the order id alone reached
 * every action below, and the id travels to the browser (the entry pages
 * hand it to the matchmaking screen, which fetches with it). Anyone who came
 * by an id — a support screenshot, a log line, a shared machine — could
 * cancel the order or pick its teammates.
 *
 * Three ways to qualify. A signed-in customer is matched against the order's
 * own clientUserId, admins pass by role, and everyone else has to present the
 * order's access token: a guest has no account to be checked against, so
 * holding the secret from their confirmation link is the proof. See
 * app/(marketing)/order/[token], which reads it server-side.
 *
 * A caller who fails is answered with the same 404 as an order that doesn't
 * exist — a 403 would confirm the id is real, which is what probing is for.
 */
async function authorizeOrder(orderId: string, request: Request) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, clientUserId: true, accessToken: true, status: true },
  });
  if (!order) return null;

  const given = request.headers.get("x-order-token");
  if (given && order.accessToken && tokenMatches(given, order.accessToken)) return order;

  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role === "ADMIN") return order;
  return order.clientUserId === session.user.id ? order : null;
}

/** Customer-side read of one order, in the shape the matchmaking screens expect. */
export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!(await authorizeOrder(orderId, request))) {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }

  // No scheduler in this deployment, so the clock-driven transitions catch
  // up whenever someone reads the order.
  await reconcileOrder(orderId);

  const order = await prisma.order.findUnique({ where: { id: orderId }, include });
  if (!order) return NextResponse.json({ error: "Unknown order." }, { status: 404 });

  // Every timestamp in the payload is server time, but the screens tick on
  // the browser's clock. Sending ours lets the client measure the difference
  // instead of assuming there is none — a browser running even slightly
  // behind used to sit on 0:00 until it caught up.
  return NextResponse.json(
    { order: toCustomerOrder(order), serverNow: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * The customer's actions on their own order: picking teammates, setting
 * preferences, cancelling. The pick itself is settled inside a transaction
 * in the dispatch service.
 */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const authorized = await authorizeOrder(orderId, request);
  if (!authorized) {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }
  const body = await request.json();

  try {
    switch (body.action) {
      case "select": {
        const ids: string[] = Array.isArray(body.teammateIds) ? body.teammateIds : [body.teammateId];
        await selectTeammates(orderId, ids.filter(Boolean));
        break;
      }
      case "preferences": {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            vibe: body.vibe ?? undefined,
            conversationPref: body.conversationPref ?? undefined,
            playStylePref: body.playStylePref ?? undefined,
          },
        });
        break;
      }
      case "cancel": {
        // Cancelling used to be a bare status write, which meant the most
        // common way an order ends — the customer giving up while the search
        // runs — returned nothing to anybody. Only orders that were actually
        // paid for reach the refund; one still awaiting payment owes nothing.
        const cancelled = await prisma.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
          select: { id: true, orderNo: true, clientUserId: true, gameName: true, priceEUR: true, status: true },
        });
        if (authorized.status !== "AWAITING_PAYMENT" && authorized.status !== "CANCELLED") {
          await settleCancelledOrder(cancelled, "cancelled_by_customer");
        }
        break;
      }
      case "request-cancel": {
        // sessionStatus is deliberately left alone: it used to be
        // overwritten with CANCEL_REQUESTED, which threw away the stage the
        // session was actually at, so a declined request had nothing to
        // return to. CANCEL_PENDING on the order says everything needed.
        await prisma.order.update({
          where: { id: orderId },
          data: { status: "CANCEL_PENDING" },
        });
        break;
      }
      // "add-games" used to live here and simply incremented the booking.
      // It is a purchase, so it moved to addGames() in
      // app/actions/sessionExtras.ts, where it is paid for first.
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof DispatchError ? err.message : "Couldn't update that order.";
    return NextResponse.json({ error: message }, { status: err instanceof DispatchError ? 409 : 500 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include });
  // selectTeammates() announces its own change; the other actions here
  // (preferences, cancel, add-games) don't go through the dispatch service.
  if (body.action !== "select") {
    const teammates = await prisma.dispatchCandidate.findMany({
      where: { orderId },
      select: { teammate: { select: { userId: true } } },
    });
    const userIds = [
      order?.clientUserId,
      ...teammates.map((candidate) => candidate.teammate.userId),
    ].filter((id): id is string => Boolean(id));
    await publish({ topic: "orders", key: orderId, userIds });
  }
  return NextResponse.json({ order: order ? toCustomerOrder(order) : null, serverNow: Date.now() });
}
