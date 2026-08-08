import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MatchmakingScreen } from "@/components/matchmaking/MatchmakingScreen";
import { OrderNotFound } from "@/components/matchmaking/OrderNotFound";

export const metadata: Metadata = { title: "Your order" };
export const dynamic = "force-dynamic";

/**
 * An order reached by its access token.
 *
 * This is the URL that leaves the building — it goes in the confirmation
 * mail, gets forwarded, pasted into Discord and quoted in support threads.
 * The older /checkout/matching?order=<id> form put the order's real id in
 * that link, and the id is what every internal API route is keyed by, so
 * anyone holding the link held the key to those routes too.
 *
 * The token is resolved to an id here, server-side, and only the id crosses
 * into the app's own requests. It never appears in the address bar.
 *
 * Knowing the token is what proves ownership — a guest has no account to
 * sign into, so there is nothing else it could be checked against. That is
 * the same trade the old URL made, with a handle that isn't a database key.
 */
export default async function OrderByTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const order = await prisma.order.findUnique({
    where: { accessToken: token },
    select: { id: true, accessToken: true },
  });

  if (!order) {
    return (
      <main className="checkout-page">
        <div className="container">
          <OrderNotFound subject="order" />
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="container">
        <MatchmakingScreen orderId={order.id} accessToken={order.accessToken} />
      </div>
    </main>
  );
}
