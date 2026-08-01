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

        <div className="checkout-layout">
          <div>
            <CheckoutForm total={total} />
          </div>

          <aside className="checkout-card">
            <div className="checkout-card__title">Order summary</div>
            <div className="order-summary__item">
              <span>Game</span>
              <span>{game?.name ?? "—"}</span>
            </div>
            <div className="order-summary__item">
              <span>Option</span>
              <span>{option}</span>
            </div>
            <div className="order-summary__item">
              <span>Teammates</span>
              <span>{teammates}</span>
            </div>
            <div className="order-summary__total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
