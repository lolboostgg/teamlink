import { PriceTag } from "@/components/currency/PriceTag";

interface Props {
  gameName: string;
  option: string;
  teammates: number;
  subtotalEUR: number;
  feeEUR: number;
  feeLabel?: string;
  totalEUR: number;
}

export function CheckoutOrderSummary({ gameName, option, teammates, subtotalEUR, feeEUR, feeLabel, totalEUR }: Props) {
  return (
    <aside className="checkout-card">
      <div className="checkout-card__title">Order summary</div>
      <div className="order-summary__item">
        <span>Game</span>
        <span>{gameName}</span>
      </div>
      <div className="order-summary__item">
        <span>Option</span>
        <span>{option}</span>
      </div>
      <div className="order-summary__item">
        <span>Teammates</span>
        <span>{teammates}</span>
      </div>
      <div className="order-summary__item">
        <span>Subtotal</span>
        <PriceTag amountEUR={subtotalEUR} />
      </div>
      {feeEUR > 0 && (
        <div className="order-summary__item">
          <span>{feeLabel ?? "Processing fee"}</span>
          <PriceTag amountEUR={feeEUR} />
        </div>
      )}
      <div className="order-summary__total">
        <span>Total</span>
        <PriceTag amountEUR={totalEUR} />
      </div>
    </aside>
  );
}
