import type { Metadata } from "next";
import { getGameBySlug } from "@/lib/games";
import { TEAMMATES } from "@/lib/teammates";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { TrustBadge } from "@/components/ui/TrustBadge";

export const metadata: Metadata = {
  title: "Checkout",
};

interface Props {
  searchParams: Promise<{ game?: string; option?: string; teammates?: string; total?: string; teammate?: string }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const game = params.game ? getGameBySlug(params.game) : undefined;
  const option = params.option ?? "Duo";
  const teammates = Number(params.teammates ?? 1);
  const total = Number(params.total ?? 4.99);
  const teammateName =
    !params.teammate || params.teammate === "random"
      ? "Random match"
      : TEAMMATES.find((t) => t.id === params.teammate)?.name ?? "Random match";

  return (
    <main className="checkout-page section-relative">
      <span className="bg-glow bg-glow--blue" style={{ width: 480, height: 480, right: "-160px", top: "-80px" }} aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div className="checkout-header">
          <h1 className="checkout-title">Checkout</h1>
          <TrustBadge />
        </div>

        <CheckoutForm
          gameSlug={game?.slug ?? ""}
          gameName={game?.name ?? "Your game"}
          option={option}
          teammates={teammates}
          teammateId={params.teammate}
          teammateName={teammateName}
          baseTotalEUR={total}
        />
      </div>
    </main>
  );
}
