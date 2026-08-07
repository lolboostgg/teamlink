"use client";

// THROWAWAY — see .claude/skills/prototype/UI.md.
// Variant B — "Guided steps": one decision at a time (category, then mode,
// then review) behind a step indicator, instead of everything on screen at
// once. Closer to a checkout wizard than a picker page.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { CheckoutIngameStep, type IngameIdentity } from "@/components/checkout/CheckoutIngameStep";
import { BOOKING_CATEGORIES, type BookingOption } from "@/lib/bookingOptions";
import { PriceTag } from "@/components/currency/PriceTag";
import { TrustPoints } from "@/components/ui/TrustPoints";
import type { Game } from "@/lib/games";

const CATEGORY_ICONS: Record<string, string> = {
  "Team Up": "fa-solid fa-user-group",
  Ranked: "fa-solid fa-trophy",
  Social: "fa-solid fa-comments",
  Coaching: "fa-solid fa-chalkboard-user",
};

const STEPS = ["Category", "Mode", "Review"];

export function BookingVariantB({ game }: { game: Game }) {
  const router = useRouter();
  const { status } = useSession();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(BOOKING_CATEGORIES[0]);
  const [selected, setSelected] = useState<BookingOption>(BOOKING_CATEGORIES[0].options[0]);
  const [groupSize, setGroupSize] = useState(1);
  const [ingameOpen, setIngameOpen] = useState(false);
  const total = useMemo(() => selected.price * groupSize, [selected, groupSize]);

  function goToCheckout(ingame?: IngameIdentity) {
    const params = new URLSearchParams({ game: game.slug, option: selected.name, teammates: String(groupSize), total: total.toFixed(2) });
    if (ingame) {
      params.set("ign", ingame.ign);
      params.set("region", ingame.region);
      if (ingame.roles.length > 0) params.set("roles", ingame.roles.join(","));
      if (ingame.rank) params.set("rank", ingame.rank);
      if (ingame.division) params.set("division", ingame.division);
    }
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="proto-b">
      <div className="proto-b__steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`proto-b__step${i === step ? " is-active" : ""}${i < step ? " is-done" : ""}`}>
            <span className="proto-b__step-dot">{i < step ? <i className="fa-solid fa-check" /> : i + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="proto-b__card">
        {step === 0 && (
          <>
            <h3>Pick a category</h3>
            <div className="proto-b__cat-grid">
              {BOOKING_CATEGORIES.map((cat) => (
                <button
                  key={cat.category}
                  type="button"
                  className={`proto-b__cat-tile${category.category === cat.category ? " is-selected" : ""}`}
                  onClick={() => {
                    setCategory(cat);
                    setSelected(cat.options[0]);
                  }}
                >
                  <i className={CATEGORY_ICONS[cat.category] ?? "fa-solid fa-gamepad"} aria-hidden="true" />
                  <strong>{cat.category}</strong>
                  <span>{cat.options.length} modes</span>
                </button>
              ))}
            </div>
            <div className="proto-b__actions">
              <span />
              <button type="button" className="btn btn--vivid" onClick={() => setStep(1)}>
                Next <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h3>Pick a mode — {category.category}</h3>
            <div className="proto-b__modes">
              {category.options.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className={`booking-option${selected.name === option.name ? " is-selected" : ""}`}
                  onClick={() => setSelected(option)}
                >
                  <span className="booking-option__main">
                    <span className="booking-option__name">{option.name}</span>
                    <span className="booking-option__desc">{option.description}</span>
                  </span>
                  <span className="booking-option__price">
                    <span className="booking-option__price-value">
                      <PriceTag amountEUR={option.price} />
                      <span className="booking-option__unit">{option.unit}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="proto-b__teammates">
              <span>Teammates</span>
              <div className="booking-stepper">
                <button type="button" onClick={() => setGroupSize((n) => Math.max(1, n - 1))} disabled={groupSize <= 1}>
                  <i className="fa-solid fa-minus" aria-hidden="true" />
                </button>
                <span className="booking-stepper__value">{groupSize}</span>
                <button type="button" onClick={() => setGroupSize((n) => Math.min(4, n + 1))} disabled={groupSize >= 4}>
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="proto-b__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setStep(0)}>
                <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back
              </button>
              <button type="button" className="btn btn--vivid" onClick={() => setStep(2)}>
                Review <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3>Review your session</h3>
            <div className="proto-b__review">
              <div>
                <span>Game</span>
                <strong>{game.name}</strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>{selected.name}</strong>
              </div>
              <div>
                <span>Teammates</span>
                <strong>{groupSize}</strong>
              </div>
              <div className="proto-b__review-total">
                <span>Total</span>
                <PriceTag amountEUR={total} />
              </div>
            </div>
            <TrustPoints compact />
            <div className="proto-b__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>
                <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back
              </button>
              <button type="button" className="btn btn--vivid" onClick={() => setIngameOpen(true)}>
                Continue to checkout
              </button>
            </div>
          </>
        )}
      </div>

      <Modal open={ingameOpen} onClose={() => setIngameOpen(false)} labelledBy="proto-b-ingame-title">
        <div className="ingame-modal">
          <CheckoutIngameStep
            headingId="proto-b-ingame-title"
            gameSlug={game.slug}
            gameName={game.name}
            canSave={status === "authenticated"}
            backLabel="Cancel"
            continueLabel="Continue to checkout"
            onBack={() => setIngameOpen(false)}
            onContinue={(ingame) => {
              setIngameOpen(false);
              goToCheckout(ingame);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
