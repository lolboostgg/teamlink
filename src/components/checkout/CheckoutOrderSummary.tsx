import { PriceTag } from "@/components/currency/PriceTag";
import { TrustPoints } from "@/components/ui/TrustPoints";
import { gameIcon } from "@/lib/gameArt";

interface Props {
  gameSlug: string;
  gameName: string;
  option: string;
  teammates: number;
  subtotalEUR: number;
  feeEUR: number;
  feeLabel?: string;
  totalEUR: number;
  discountEUR?: number;
  couponCode?: string | null;
  onOpenCoupon?: () => void;
  onRemoveCoupon?: () => void;
}

export function CheckoutOrderSummary({
  gameSlug,
  gameName,
  option,
  teammates,
  subtotalEUR,
  feeEUR,
  feeLabel,
  totalEUR,
  discountEUR = 0,
  couponCode,
  onOpenCoupon,
  onRemoveCoupon,
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

      {discountEUR > 0 && couponCode ? (
        <div className="order-summary__item order-summary__item--discount">
          <span>
            <i className="fa-solid fa-ticket" aria-hidden="true" /> Coupon {couponCode}
          </span>
          <span>
            −<PriceTag amountEUR={discountEUR} />
            {onRemoveCoupon && (
              <button type="button" className="order-summary__coupon-remove" onClick={onRemoveCoupon} aria-label="Remove coupon">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            )}
          </span>
        </div>
      ) : (
        onOpenCoupon && (
          <button type="button" className="order-summary__coupon-trigger" onClick={onOpenCoupon}>
            <span>
              <i className="fa-solid fa-ticket" aria-hidden="true" /> Add a coupon
            </span>
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        )
      )}

      <div className="order-summary__total">
        <span className="order-summary__total-label">Total</span>
        <PriceTag amountEUR={totalEUR} />
      </div>

      {/* Guarantees live in the same card as the price rather than in a
          second panel below it — this is the moment they answer a question
          about, and two stacked cards made the column read as taller and
          less resolved than the form beside it. */}
      <TrustPoints />
    </aside>
  );
}
