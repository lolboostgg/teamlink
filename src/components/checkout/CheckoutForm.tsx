"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckoutIdentityStep } from "@/components/checkout/CheckoutIdentityStep";
import { CheckoutPaymentStep } from "@/components/checkout/CheckoutPaymentStep";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { CouponModal } from "@/components/checkout/CouponModal";
import { TrustPoints } from "@/components/ui/TrustPoints";
import { Reveal } from "@/components/ui/Reveal";
import { calculateFee, getPaymentMethod, perMinuteRate, type PaymentMethodKey } from "@/lib/payments";
import { placeOrder } from "@/lib/matchmaking/createOrderClient";
import { markCouponUsed, type Coupon } from "@/lib/coupons";
import { useCreditBalance } from "@/lib/useCreditBalance";
import { spendCredits } from "@/app/actions/credits";
import { useToast } from "@/components/ui/ToastProvider";

interface Props {
  gameSlug: string;
  gameName: string;
  option: string;
  teammates: number;
  baseTotalEUR: number;
}

type Step = "identity" | "payment";
type Identity = { mode: "guest"; email: string } | { mode: "account" } | null;

// Orchestrates the checkout flow: identity (guest email or login/register)
// -> payment method + fee -> mock submit. Owns both columns because the
// order summary must react live to the selected payment method's fee.
export function CheckoutForm({ gameSlug, gameName, option, teammates, baseTotalEUR }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("identity");
  const [identity, setIdentity] = useState<Identity>(null);
  const [method, setMethod] = useState<PaymentMethodKey>("card");
  const [submitting, setSubmitting] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { balanceCents: creditBalanceCents } = useCreditBalance(identity?.mode === "account");

  const feeEUR = useMemo(() => calculateFee(baseTotalEUR, method), [baseTotalEUR, method]);
  const discountEUR = appliedCoupon ? Math.round(baseTotalEUR * (appliedCoupon.discountPercent / 100) * 100) / 100 : 0;
  const totalEUR = Math.max(0, baseTotalEUR + feeEUR - discountEUR);
  const feeLabel = feeEUR > 0 ? `${getPaymentMethod(method).brandLabel} fee` : undefined;

  function handleGuestContinue(email: string) {
    setIdentity({ mode: "guest", email });
    setStep("payment");
  }

  function handleLoggedIn() {
    setIdentity({ mode: "account" });
    setStep("payment");
  }

  async function handlePaymentSubmit() {
    setSubmitting(true);

    // The one real payment path here — deducts from the actual Postgres
    // balance before the order is created, instead of simulating success
    // like card/paypal/crypto do.
    if (method === "credits") {
      const result = await spendCredits(totalEUR, `${gameName} · ${option}`);
      if (!result.ok) {
        setSubmitting(false);
        showToast(result.error ?? "Couldn't pay with credits.", "error");
        return;
      }
    }

    // Who you actually get is decided by the live dispatch/pick flow after
    // checkout, never chosen up front — and the fan-out to teammates is a
    // server decision (see lib/dispatch/create.ts).
    const order = await placeOrder({
      gameSlug,
      gameName,
      option,
      priceEUR: totalEUR,
      teammates,
      requestedTeammateId: null,
      customerLabel: identity?.mode === "guest" ? identity.email : "Logged-in customer",
    });
    // Only burns the coupon once the order is actually placed — applying
    // it in the modal alone doesn't consume it, so abandoning checkout
    // leaves it usable.
    if (appliedCoupon) markCouponUsed(appliedCoupon.code);
    router.push(order ? `/checkout/matching?order=${order.id}` : "/checkout/success");
  }

  function handleStartPayAsYouGo() {
    setSubmitting(true);
    const params = new URLSearchParams({
      game: gameName,
      option,
      rate: perMinuteRate(baseTotalEUR).toFixed(2),
    });
    setTimeout(() => {
      router.push(`/checkout/session?${params.toString()}`);
    }, 700);
  }

  return (
    <div className="checkout-layout">
      <div>
        <Reveal>
          <div className="checkout-steps">
            <span className={`checkout-steps__item${step === "identity" ? " is-active" : " is-done"}`}>
              <span className="checkout-steps__num">
                {step === "payment" ? <i className="fa-solid fa-check" aria-hidden="true" /> : "1"}
              </span>
              Your details
            </span>
            <span className="checkout-steps__line" aria-hidden="true" />
            <span className={`checkout-steps__item${step === "payment" ? " is-active" : ""}`}>
              <span className="checkout-steps__num">2</span>
              Payment
            </span>
          </div>
        </Reveal>

        {step === "identity" && (
          <Reveal delay={80}>
            <CheckoutIdentityStep onContinueAsGuest={handleGuestContinue} onLoggedIn={handleLoggedIn} />
          </Reveal>
        )}

        {step === "payment" && (
          <>
            <Reveal delay={80}>
              <div className="checkout-card checkout-card--identity">
                <span className="checkout-card__identity-text">
                  <i className="fa-solid fa-circle-check" aria-hidden="true" />
                  {identity?.mode === "guest"
                    ? `Checking out as guest (${identity.email})`
                    : "Checking out as logged-in user"}
                </span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep("identity")}>
                  Change
                </button>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <CheckoutPaymentStep
                method={method}
                onMethodChange={setMethod}
                totalEUR={totalEUR}
                submitting={submitting}
                onSubmit={handlePaymentSubmit}
                onStartPayAsYouGo={handleStartPayAsYouGo}
                creditsEnabled={identity?.mode === "account"}
                creditBalanceCents={creditBalanceCents}
              />
            </Reveal>
          </>
        )}
      </div>

      <div>
        <Reveal delay={80}>
          <CheckoutOrderSummary
            gameSlug={gameSlug}
            gameName={gameName}
            option={option}
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
        <Reveal delay={140}>
          <TrustPoints />
        </Reveal>
      </div>

      <CouponModal open={couponModalOpen} onClose={() => setCouponModalOpen(false)} onApply={setAppliedCoupon} />
    </div>
  );
}
