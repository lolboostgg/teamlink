import type { Metadata } from "next";
import { MatchmakingScreen } from "@/components/matchmaking/MatchmakingScreen";

export const metadata: Metadata = { title: "Finding your teammate" };

interface Props {
  searchParams: Promise<{ order?: string }>;
}

export default async function CheckoutMatchingPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="checkout-page">
      <div className="container">
        {params.order ? (
          <MatchmakingScreen orderId={params.order} />
        ) : (
          <p className="matching-screen__lost">Missing order reference.</p>
        )}
      </div>
    </main>
  );
}
