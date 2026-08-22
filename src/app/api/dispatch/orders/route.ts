import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { reconcileOrder } from "@/lib/dispatch/service";
import { toCustomerOrder } from "@/lib/dispatch/customerView";

export const dynamic = "force-dynamic";

/**
 * The signed-in customer's own orders, newest first. Guests get nothing —
 * their order id lives in the checkout URL, which is what the matching and
 * session screens read.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ orders: [] });

  // Having a roster row is what makes this a teammate's request, not the
  // account's role — an admin with a profile of their own works the same
  // dispatch views as anyone else on the roster.
  const teammate = await prisma.teammate.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const orderWhere = teammate
    ? { candidates: { some: { teammateId: teammate.id, selected: true } } }
    : { clientUserId: session.user.id };

  // One shape, declared once: the re-read below has to match the first read
  // exactly or the two halves of the response disagree about what an order
  // looks like, and that is the kind of drift a copy-paste invites.
  const ORDER_SHAPE = {
    candidates: { include: { teammate: { include: { _count: { select: { reviewsReceived: true } } } } } },
    review: true,
    clientUser: { select: { avatarUrl: true, avatarFocusX: true, avatarFocusY: true, avatarZoom: true } },
  } as const;

  const rows = await prisma.order.findMany({
    where: orderWhere,
    include: ORDER_SHAPE,
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  // Reconciling used to be a `for` loop of awaits — forty orders meant forty
  // round trips one after another, on a connection held for all of them, and
  // this endpoint is polled by every open dashboard tab. Nothing here reads
  // another order's result, so they all go at once and the endpoint costs one
  // round trip's latency instead of forty.
  const live = rows.filter((row) => !["COMPLETED", "CANCELLED", "NO_MATCH"].includes(row.status));
  await Promise.all(live.map((row) => reconcileOrder(row.id)));

  // Only what reconciling could have moved is read back. A completed order is
  // final — re-reading all forty (with the per-candidate review counts that
  // makes those joins expensive) to pick up changes that can only ever land
  // on the open ones was doing the whole page's most expensive query twice.
  // On an order history where everything is finished, it is now skipped.
  const refreshed = live.length
    ? await prisma.order.findMany({ where: { id: { in: live.map((row) => row.id) } }, include: ORDER_SHAPE })
    : [];
  const byId = new Map(refreshed.map((row) => [row.id, row]));
  const fresh = rows.map((row) => byId.get(row.id) ?? row);

  return NextResponse.json(
    { orders: fresh.map(toCustomerOrder) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// There is deliberately no POST here any more. Placing an order is a
// payment, so it goes through placeCheckoutOrder() in app/actions/checkout.ts
// — an endpoint that created a live, dispatched order for whatever price the
// caller sent was a way to book for free.
