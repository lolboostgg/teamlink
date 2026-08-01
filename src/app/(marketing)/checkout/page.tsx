import type { Metadata } from "next";
import { getGameBySlug } from "@/lib/games";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
};

interface Props {
  searchParams: Promise<{ game?: string; option?: string; teammates?: string; total?: string }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const game = params.game ? getGameBySlug(params.game) : undefined;
  const option = params.option ?? "Duo";
  const teammates = Number(params.teammates ?? 1);
  const total = Number(params.total ?? 4.99);

  return (
    <main className="checkout-page">
      <div className="container">
        <h1 className="checkout-title">Checkout</h1>

        <CheckoutForm gameName={game?.name ?? "—"} option={option} teammates={teammates} baseTotalEUR={total} />
      </div>
    </main>
  );
}
