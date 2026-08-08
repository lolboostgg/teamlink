import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

  // Either the human order number (#1108) or the raw id, so older links keep
  // resolving.
  const orderNo = Number(params.order);
  const order = await prisma.order.findUnique({
    where: Number.isInteger(orderNo) && orderNo > 0 ? { orderNo } : { id: params.order },
    select: { id: true, accessToken: true, orderNo: true, clientUserId: true },
  });

  // A signed-in customer looking at their own order stays here, on the
  // readable URL. The token exists so a guest can prove an order is theirs
  // without an account; somebody who has one has already proved it, and
  // sending them to a 32-character secret is a worse address for no gain.
  const session = await auth();
  const isOwner = Boolean(order?.clientUserId && order.clientUserId === session?.user?.id);

  if (order && !isOwner && order.accessToken) {
    const query = params.checkout ? `?checkout=${encodeURIComponent(params.checkout)}` : "";
    redirect(`/order/${encodeURIComponent(order.accessToken)}${query}`);
  }

  // The owner, or an order written before accessToken existed and missed the
  // backfill. Either way the session is what authorises the API calls, so no
  // token is handed to the screen.
  if (!order) {
    return (
      <main className="checkout-page">
        <div className="container">
          <p className="matching-screen__lost">Missing order reference.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="container">
        <MatchmakingScreen orderId={order.id} />
      </div>
    </main>
  );
}
