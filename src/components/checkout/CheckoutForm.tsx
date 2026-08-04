"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckoutIdentityStep } from "@/components/checkout/CheckoutIdentityStep";
import { CheckoutIngameStep, type IngameIdentity } from "@/components/checkout/CheckoutIngameStep";
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
  /** Already answered on the booking page, if the customer came that way. */
  initialIngame?: IngameIdentity | null;
}

type Step = "identity" | "ingame" | "payment";

const STEPS: { key: Step; label: string }[] = [
  { key: "identity", label: "Your details" },
  { key: "ingame", label: "In-game info" },
  { key: "payment", label: "Payment" },
];
type Identity = { mode: "guest"; email: string } | { mode: "account" } | null;

// Orchestrates the checkout flow: identity (guest email or login/register)
// -> in-game account -> payment method + fee -> submit. Owns both columns
// because the order summary must react live to the payment method's fee.
export function CheckoutForm({ gameSlug, gameName, option, teammates, baseTotalEUR, initialIngame = null }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
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
      // Frozen onto the order: editing the saved account later must not
      // rewrite who a past order was played on.
      ign: ingame?.ign ?? null,
      ignRegion: ingame?.region ?? null,
      ignRoles: ingame?.roles ?? [],
      ignRank: ingame?.rank ?? null,
      ignDivision: ingame?.division ?? null,
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
            {STEPS.map((entry, index) => {
              const position = STEPS.findIndex((s) => s.key === step);
              const done = index < position;
              return (
                <Fragment key={entry.key}>
                  {index > 0 && <span className="checkout-steps__line" aria-hidden="true" />}
                  <span
                    className={`checkout-steps__item${step === entry.key ? " is-active" : done ? " is-done" : ""}`}
                  >
                    <span className="checkout-steps__num">
                      {done ? <i className="fa-solid fa-check" aria-hidden="true" /> : index + 1}
                    </span>
                    {entry.label}
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

            {ingame && (
              <Reveal delay={100}>
                <div className="checkout-card checkout-card--identity">
                  <span className="checkout-card__identity-text">
                    <i className="fa-solid fa-gamepad" aria-hidden="true" />
                    Playing as {ingame.ign} ({ingame.region})
                  </span>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep("ingame")}>
                    Change
                  </button>
                </div>
              </Reveal>
            )}
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
