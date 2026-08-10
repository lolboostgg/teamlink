import type { Metadata } from "next";
import { getGameBySlug } from "@/lib/games";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { getCommunityStats } from "@/lib/community";

export const metadata: Metadata = {
  title: "Checkout",
};

interface Props {
  searchParams: Promise<{
    game?: string;
    option?: string;
    teammates?: string;
    total?: string;
    ign?: string;
    region?: string;
    roles?: string;
    rank?: string;
    division?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const game = params.game ? getGameBySlug(params.game) : undefined;
  const option = params.option ?? "Duo";
  const teammates = Number(params.teammates ?? 1);
  const total = Number(params.total ?? 4.99);
  const community = await getCommunityStats();

  return (
    <main className="checkout-page section-relative">
      <span className="bg-glow bg-glow--blue" style={{ width: 480, height: 480, right: "-160px", top: "-80px" }} aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div className="checkout-header">
          <h1 className="checkout-title">Checkout</h1>
          <TrustBadge score={community.averageRating} reviews={community.reviews} />
        </div>

        <CheckoutForm
          gameSlug={game?.slug ?? ""}
          gameName={game?.name ?? "Your game"}
          option={option}
          teammates={teammates}
          baseTotalEUR={total}
          // Collected on the booking page; passing it through means checkout
          // doesn't ask the same question twice.
          initialIngame={
            params.ign && params.region
              ? {
                  ign: params.ign,
                  region: params.region,
                  roles: params.roles ? params.roles.split(",").filter(Boolean) : [],
                  rank: params.rank ?? null,
                  division: params.division ?? null,
                }
              : null
          }
        />
      </div>
    </main>
  );
}
