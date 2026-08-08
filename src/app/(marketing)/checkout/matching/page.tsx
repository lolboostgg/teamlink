import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MatchmakingScreen } from "@/components/matchmaking/MatchmakingScreen";

export const metadata: Metadata = { title: "Finding your teammate" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ order?: string; checkout?: string }>;
}

/**
 * The older order URL, keyed by the order's real id.
 *
 * Still reached from Stripe return paths and a few dashboard links, so it
 * cannot simply go away. It forwards to /order/<accessToken> instead, which
 * is the form everything else already uses — the id is a database key, and
 * the order API now wants the token rather than the key (see authorizeOrder()
 * in api/dispatch/orders/[orderId]).
 *
 * `checkout` rides along: MatchmakingScreen reads it off the URL to settle a
 * payment on the way back from Stripe without waiting for the webhook.
 */
export default async function CheckoutMatchingPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!params.order) {
    return (
      <main className="checkout-page">
        <div className="container">
          <p className="matching-screen__lost">Missing order reference.</p>
        </div>
      </main>
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.order },
    select: { id: true, accessToken: true },
  });

  if (order?.accessToken) {
    const query = params.checkout ? `?checkout=${encodeURIComponent(params.checkout)}` : "";
    redirect(`/order/${encodeURIComponent(order.accessToken)}${query}`);
  }

  // Only an order written before accessToken existed and missed the backfill
  // lands here. A signed-in owner is still recognised by their session; a
  // guest holding one of these has nothing left to prove it with.
  return (
    <main className="checkout-page">
      <div className="container">
        <MatchmakingScreen orderId={params.order} />
      </div>
    </main>
  );
}
