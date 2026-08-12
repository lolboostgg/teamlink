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

  const teammate = session.user.role === "TEAMMATE"
    ? await prisma.teammate.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;
  const orderWhere = teammate
    ? { candidates: { some: { teammateId: teammate.id, selected: true } } }
    : { clientUserId: session.user.id };

  const rows = await prisma.order.findMany({
    where: orderWhere,
    include: {
      candidates: { include: { teammate: { include: { _count: { select: { reviewsReceived: true } } } } } },
      review: true,
      clientUser: { select: { avatarUrl: true, avatarFocusX: true, avatarFocusY: true, avatarZoom: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  for (const row of rows) {
    if (!["COMPLETED", "CANCELLED", "NO_MATCH"].includes(row.status)) await reconcileOrder(row.id);
  }

  const fresh = await prisma.order.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: {
      candidates: { include: { teammate: { include: { _count: { select: { reviewsReceived: true } } } } } },
      review: true,
      clientUser: { select: { avatarUrl: true, avatarFocusX: true, avatarFocusY: true, avatarZoom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    { orders: fresh.map(toCustomerOrder) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// There is deliberately no POST here any more. Placing an order is a
// payment, so it goes through placeCheckoutOrder() in app/actions/checkout.ts
// — an endpoint that created a live, dispatched order for whatever price the
// caller sent was a way to book for free.
