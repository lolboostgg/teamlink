"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckoutIdentityStep } from "@/components/checkout/CheckoutIdentityStep";
import { CheckoutIngameStep, type IngameIdentity } from "@/components/checkout/CheckoutIngameStep";
import { CheckoutPaymentStep } from "@/components/checkout/CheckoutPaymentStep";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { CouponModal } from "@/components/checkout/CouponModal";
import { Reveal } from "@/components/ui/Reveal";
import { calculateFee, getPaymentMethod, type PaymentMethodKey } from "@/lib/payments";
import { placeCheckoutOrder } from "@/app/actions/checkout";
import { type Coupon } from "@/lib/coupons";
import { useCreditBalance } from "@/lib/useCreditBalance";
import { bookingSteps, type BookingStepKey } from "@/lib/bookingSteps";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/components/language/LanguageProvider";

interface Props {
  gameSlug: string;
  gameName: string;
  option: string;
  teammates: number;
  baseTotalEUR: number;
  /** The mode's answers, encoded (see lib/bookingOptions encodeAddons). Sent
   * back to the server, which prices them from the catalogue again. */
  addons?: string;
  addonSummary?: { key: string; label: string; value: string }[];
  /** Already answered on the booking page, if the customer came that way. */
  initialIngame?: IngameIdentity | null;
}

type Step = "identity" | "ingame" | "payment";

/** This form's own step names, mapped onto the shared path in lib/bookingSteps. */
const STEP_KEY: Record<Step, BookingStepKey> = {
  identity: "details",
  ingame: "ingame",
  payment: "pay",
};
type Identity = { mode: "guest"; email: string } | { mode: "account" } | null;

// Orchestrates the checkout flow: identity (guest email or login/register)
// -> in-game account -> payment method + fee -> submit. Owns both columns
// because the order summary must react live to the payment method's fee.
export function CheckoutForm({
  gameSlug,
  gameName,
  option,
  teammates,
  baseTotalEUR,
  addons = "",
  addonSummary = [],
  initialIngame = null,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { p } = useLanguage();
  const [step, setStep] = useState<Step>("identity");
  const [identity, setIdentity] = useState<Identity>(null);
  const [ingame, setIngame] = useState<IngameIdentity | null>(initialIngame);
  const [method, setMethod] = useState<PaymentMethodKey>("card");
  const [submitting, setSubmitting] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { balanceCents: creditBalanceCents } = useCreditBalance(identity?.mode === "account");

  const feeEUR = useMemo(() => calculateFee(baseTotalEUR, method), [baseTotalEUR, method]);
  const discountEUR = appliedCoupon ? Math.round(baseTotalEUR * (appliedCoupon.discountPercent / 100) * 100) / 100 : 0;
  const totalEUR = Math.max(0, baseTotalEUR + feeEUR - discountEUR);
  const feeLabel = feeEUR > 0 ? `${getPaymentMethod(method).brandLabel} fee` : undefined;

  // Skips the in-game step when the booking page already asked.
  const nextAfterIdentity = () => (ingame ? "payment" : "ingame");

  // Built from what this order still needs, so a skipped in-game step leaves
  // the rail at four entries rather than showing a fifth nobody will see.
  // `initialIngame`, not `ingame` — the latter fills in as they go, and the
  // rail must not renumber itself under their feet mid-checkout.
  const steps = bookingSteps({ includeIngame: !initialIngame });

  function handleGuestContinue(email: string) {
    setIdentity({ mode: "guest", email });
    setStep(nextAfterIdentity());
  }

  function handleLoggedIn() {
    setIdentity({ mode: "account" });
    setStep(nextAfterIdentity());
  }

  function handleIngameContinue(next: IngameIdentity) {
    setIngame(next);
    setStep("payment");
  }

  async function handlePaymentSubmit() {
    if (submitting) return;
    setSubmitting(true);

    // Everything that decides what this costs — the catalogue price, the
    // method fee, the coupon — is recomputed on the server. The totals in
    // this component are what the customer sees, never what they are
    // charged, because a URL and a React state are both theirs to edit.
    try {
      const result = await placeCheckoutOrder({
        gameSlug,
        option,
        addons,
        teammates,
        method,
        couponCode: appliedCoupon?.code ?? null,
        guestEmail: identity?.mode === "guest" ? identity.email : null,
        // Frozen onto the order: editing the saved account later must not
        // rewrite who a past order was played on.
        ign: ingame?.ign ?? null,
        ignRegion: ingame?.region ?? null,
        ignRoles: ingame?.roles ?? [],
        ignRank: ingame?.rank ?? null,
        ignDivision: ingame?.division ?? null,
      });

      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }

      // Either our own matching screen (paid from credits) or Stripe's hosted
      // page; the teammates are only invited once the payment lands.
      if (result.redirect.startsWith("http")) window.location.assign(result.redirect);
      else router.push(result.redirect);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Checkout failed. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-layout">
      <div>
        <Reveal>
          <div className="checkout-steps">
            {steps.map((entry, index) => {
              const position = steps.findIndex((s) => s.key === STEP_KEY[step]);
              // "mode" is behind them the moment they reach this page, and
              // "match" is still ahead — both belong on the rail so the count
              // matches the one the booking sidebar showed a click ago.
              const done = index < position;
              return (
                <Fragment key={entry.key}>
                  {index > 0 && (
                    // Filled up to where you are, so the rail reads as a
                    // progress bar rather than three dots on a hairline.
                    <span
                      className={`checkout-steps__line${index <= position ? " is-done" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`checkout-steps__item${
                      entry.key === STEP_KEY[step] ? " is-active" : done ? " is-done" : ""
                    }`}
                  >
                    <span className="checkout-steps__num">
                      {done ? <i className="fa-solid fa-check" aria-hidden="true" /> : index + 1}
                    </span>
                    {p(entry.label)}
                  </span>
                </Fragment>
              );
            })}
          </div>
        </Reveal>

        {step === "identity" && (
          <Reveal delay={80}>
            <CheckoutIdentityStep onContinueAsGuest={handleGuestContinue} onLoggedIn={handleLoggedIn} />
          </Reveal>
        )}

        {step === "ingame" && (
          <Reveal delay={80}>
            <CheckoutIngameStep
              gameSlug={gameSlug}
              gameName={gameName}
              canSave={identity?.mode === "account"}
              onContinue={handleIngameContinue}
              onBack={() => setStep("identity")}
            />
          </Reveal>
        )}

        {step === "payment" && (
          <>
            {/* One recap card with a row per answered step — as separate
                cards these two read as pending form sections rather than
                as settled answers you can go back and correct. */}
            <Reveal delay={80}>
              <div className="checkout-card checkout-recap">
                <div className="checkout-recap__row">
                  <span className="checkout-recap__text">
                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    {identity?.mode === "guest"
                      ? `${p("Checking out as guest")} (${identity.email})`
                      : p("Checking out as logged-in user")}
                  </span>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep("identity")}>
                    {p("Change")}
                  </button>
                </div>

                {ingame && (
                  <div className="checkout-recap__row">
                    <span className="checkout-recap__text">
                      <i className="fa-solid fa-gamepad" aria-hidden="true" />
                      {p("Playing as")} {ingame.ign} ({ingame.region})
                    </span>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep("ingame")}>
                      {p("Change")}
                    </button>
                  </div>
                )}
              </div>
            </Reveal>
            <Reveal delay={140}>
              <CheckoutPaymentStep
                method={method}
                onMethodChange={setMethod}
                totalEUR={totalEUR}
                submitting={submitting}
                onSubmit={handlePaymentSubmit}
                creditsEnabled={identity?.mode === "account"}
                creditBalanceCents={creditBalanceCents}
              />
            </Reveal>
          </>
        )}
      </div>

      <div className="checkout-side">
        <Reveal delay={80}>
          <CheckoutOrderSummary
            gameSlug={gameSlug}
            gameName={gameName}
            option={option}
            addonSummary={addonSummary}
            teammates={teammates}
            subtotalEUR={baseTotalEUR}
            feeEUR={feeEUR}
            feeLabel={feeLabel}
            totalEUR={totalEUR}
            discountEUR={discountEUR}
            couponCode={appliedCoupon?.code}
            onOpenCoupon={() => setCouponModalOpen(true)}
            onRemoveCoupon={() => setAppliedCoupon(null)}
          />
        </Reveal>
      </div>

      <CouponModal open={couponModalOpen} onClose={() => setCouponModalOpen(false)} onApply={setAppliedCoupon} />
    </div>
  );
}
