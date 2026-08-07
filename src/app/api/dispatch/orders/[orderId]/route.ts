import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reconcileOrder, selectTeammates, DispatchError } from "@/lib/dispatch/service";
import { toCustomerOrder } from "@/lib/dispatch/customerView";
import { publish } from "@/lib/events/bus";

export const dynamic = "force-dynamic";

const include = { candidates: true, review: true, games: true } as const;

/** Customer-side read of one order, in the shape the matchmaking screens expect. */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  // No scheduler in this deployment, so the clock-driven transitions catch
  // up whenever someone reads the order.
  await reconcileOrder(orderId);

  const order = await prisma.order.findUnique({ where: { id: orderId }, include });
  if (!order) return NextResponse.json({ error: "Unknown order." }, { status: 404 });

  return NextResponse.json({ order: toCustomerOrder(order) }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * The customer's actions on their own order: picking teammates, setting
 * preferences, cancelling. The pick itself is settled inside a transaction
 * in the dispatch service.
 */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
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
        await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
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
  return NextResponse.json({ order: order ? toCustomerOrder(order) : null });
}
