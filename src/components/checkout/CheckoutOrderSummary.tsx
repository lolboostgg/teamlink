import { PriceTag } from "@/components/currency/PriceTag";
import { gameIcon } from "@/lib/gameArt";

interface Props {
  gameSlug: string;
  gameName: string;
  option: string;
  teammates: number;
  teammateName?: string;
  subtotalEUR: number;
  feeEUR: number;
  feeLabel?: string;
  totalEUR: number;
}

export function CheckoutOrderSummary({
  gameSlug,
  gameName,
  option,
  teammates,
  teammateName,
  subtotalEUR,
  feeEUR,
  feeLabel,
  totalEUR,
}: Props) {
  return (
    <aside className="checkout-card order-summary">
      <div className="order-summary__head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gameIcon(gameSlug)} alt="" className="order-summary__icon" />
        <div>
          <div className="order-summary__game">{gameName}</div>
          <div className="order-summary__option">{option}</div>
        </div>
      </div>

      <div className="order-summary__item">
        <span>
          <i className="fa-solid fa-user-group" aria-hidden="true" /> Group size
        </span>
        <span>{teammates}</span>
      </div>
      {teammateName && (
        <div className="order-summary__item">
          <span>
            <i className="fa-solid fa-user-check" aria-hidden="true" /> Teammate
          </span>
          <span>{teammateName}</span>
        </div>
      )}
      <div className="order-summary__item">
        <span>
          <i className="fa-solid fa-receipt" aria-hidden="true" /> Subtotal
        </span>
        <PriceTag amountEUR={subtotalEUR} />
      </div>
      {feeEUR > 0 && (
        <div className="order-summary__item">
          <span>
            <i className="fa-solid fa-circle-info" aria-hidden="true" /> {feeLabel ?? "Processing fee"}
          </span>
          <PriceTag amountEUR={feeEUR} />
        </div>
      )}

      <div className="order-summary__total">
        <span>Total</span>
        <PriceTag amountEUR={totalEUR} />
      </div>

      <div className="order-summary__trust">
        <i className="fa-solid fa-lock" aria-hidden="true" />
        Secure checkout, your details are never shared
      </div>
    </aside>
  );
}
