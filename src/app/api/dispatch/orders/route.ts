import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createOrderWithDispatch } from "@/lib/dispatch/create";
import { reconcileOrder } from "@/lib/dispatch/service";
import { toCustomerOrder } from "@/lib/dispatch/customerView";
import { GAMES } from "@/lib/games";

export const dynamic = "force-dynamic";

/**
 * The signed-in customer's own orders, newest first. Guests get nothing —
 * their order id lives in the checkout URL, which is what the matching and
 * session screens read.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ orders: [] });

  const rows = await prisma.order.findMany({
    where: { clientUserId: session.user.id },
    include: { candidates: true, review: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  for (const row of rows) {
    if (!["COMPLETED", "CANCELLED", "NO_MATCH"].includes(row.status)) await reconcileOrder(row.id);
  }

  const fresh = await prisma.order.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { candidates: true, review: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    { orders: fresh.map(toCustomerOrder) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Checkout places the order here — the dispatch fan-out happens server-side. */
export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json();

  const game = GAMES.find((g) => g.slug === body.gameSlug);
  if (!game) return NextResponse.json({ error: "Unknown game." }, { status: 400 });

  const priceEUR = Number(body.priceEUR);
  if (!Number.isFinite(priceEUR) || priceEUR < 0) {
    return NextResponse.json({ error: "Invalid price." }, { status: 400 });
  }

  const order = await createOrderWithDispatch({
    gameSlug: game.slug,
    gameName: game.name,
    option: String(body.option ?? "").slice(0, 120),
    priceEUR,
    teammates: Number(body.teammates) || 1,
    requestedTeammateId: body.requestedTeammateId ?? null,
    customerLabel: String(session?.user?.name || session?.user?.email || body.customerLabel || "Customer").slice(0, 120),
    clientUserId: session?.user?.id ?? null,
    isReplay: !!body.isReplay,
  });

  return NextResponse.json({ order: toCustomerOrder(order) });
}
