import { PriceTag } from "@/components/currency/PriceTag";
import { TrustPoints } from "@/components/ui/TrustPoints";
import { gameIcon } from "@/lib/gameArt";
import { useLanguage } from "@/components/language/LanguageProvider";

interface Props {
  gameSlug: string;
  gameName: string;
  option: string;
  /** What was answered about the mode — keystone level, bracket, bundle. */
  addonSummary?: { key: string; label: string; value: string }[];
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
  addonSummary = [],
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
  const { p } = useLanguage();
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

      {/* Above the group size, because these are what the customer just
          chose — leaving them off meant paying a keystone surcharge that
          nothing on this page mentioned. */}
      {addonSummary.map((addon) => (
        <div className="order-summary__item" key={addon.key}>
          <span>
            <i className="fa-solid fa-sliders" aria-hidden="true" /> {p(addon.label)}
          </span>
          <span>{addon.value}</span>
        </div>
      ))}
      <div className="order-summary__item">
        <span>
          <i className="fa-solid fa-user-group" aria-hidden="true" /> {p("Group size")}
        </span>
        <span>{teammates}</span>
      </div>
      <div className="order-summary__item">
        <span>
          <i className="fa-solid fa-receipt" aria-hidden="true" /> {p("Subtotal")}
        </span>
        <PriceTag amountEUR={subtotalEUR} />
      </div>
      {feeEUR > 0 && (
        <div className="order-summary__item">
          <span>
            <i className="fa-solid fa-circle-info" aria-hidden="true" /> {feeLabel ?? p("Processing fee")}
          </span>
          <PriceTag amountEUR={feeEUR} />
        </div>
      )}

      {discountEUR > 0 && couponCode ? (
        <div className="order-summary__item order-summary__item--discount">
          <span>
            <i className="fa-solid fa-ticket" aria-hidden="true" /> {p("Coupon")} {couponCode}
          </span>
          <span>
            −<PriceTag amountEUR={discountEUR} />
            {onRemoveCoupon && (
              <button type="button" className="order-summary__coupon-remove" onClick={onRemoveCoupon} aria-label={p("Remove coupon")}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            )}
          </span>
        </div>
      ) : (
        onOpenCoupon && (
          <button type="button" className="order-summary__coupon-trigger" onClick={onOpenCoupon}>
            <span>
              <i className="fa-solid fa-ticket" aria-hidden="true" /> {p("Add a coupon")}
            </span>
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        )
      )}

      <div className="order-summary__total">
        <span className="order-summary__total-label">{p("Total")}</span>
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
