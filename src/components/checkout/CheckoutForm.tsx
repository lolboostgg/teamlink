"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckoutIdentityStep } from "@/components/checkout/CheckoutIdentityStep";
import { CheckoutPaymentStep } from "@/components/checkout/CheckoutPaymentStep";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { CheckoutTrust } from "@/components/checkout/CheckoutTrust";
import { Reveal } from "@/components/ui/Reveal";
import { calculateFee, getPaymentMethod, perMinuteRate, type PaymentMethodKey } from "@/lib/payments";
import { createOrder } from "@/lib/matchmaking/store";

interface Props {
  gameSlug: string;
  gameName: string;
  option: string;
  teammates: number;
  teammateId?: string;
  teammateName?: string;
  baseTotalEUR: number;
}

type Step = "identity" | "payment";
type Identity = { mode: "guest"; email: string } | { mode: "account" } | null;

// Orchestrates the checkout flow: identity (guest email or login/register)
// -> payment method + fee -> mock submit. Owns both columns because the
// order summary must react live to the selected payment method's fee.
export function CheckoutForm({ gameSlug, gameName, option, teammates, teammateId, teammateName, baseTotalEUR }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");
  const [identity, setIdentity] = useState<Identity>(null);
  const [method, setMethod] = useState<PaymentMethodKey>("card");
  const [submitting, setSubmitting] = useState(false);

  const feeEUR = useMemo(() => calculateFee(baseTotalEUR, method), [baseTotalEUR, method]);
  const totalEUR = baseTotalEUR + feeEUR;
  const feeLabel = feeEUR > 0 ? `${getPaymentMethod(method).brandLabel} fee` : undefined;

  function handleGuestContinue(email: string) {
    setIdentity({ mode: "guest", email });
    setStep("payment");
  }

  function handleLoggedIn() {
    setIdentity({ mode: "account" });
    setStep("payment");
  }

  function handlePaymentSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      const order = createOrder({
        gameSlug,
        gameName,
        option,
        priceEUR: totalEUR,
        requestedTeammateId: teammateId && teammateId !== "random" ? teammateId : null,
        customerLabel: identity?.mode === "guest" ? identity.email : "Logged-in customer",
      });
      router.push(order ? `/checkout/matching?order=${order.id}` : "/checkout/success");
    }, 900);
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
            teammateName={teammateName}
            subtotalEUR={baseTotalEUR}
            feeEUR={feeEUR}
            feeLabel={feeLabel}
            totalEUR={totalEUR}
          />
        </Reveal>
        <Reveal delay={140}>
          <CheckoutTrust />
        </Reveal>
      </div>
    </div>
  );
}
