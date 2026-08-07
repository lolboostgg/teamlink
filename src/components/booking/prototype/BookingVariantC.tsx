"use client";

// THROWAWAY — see .claude/skills/prototype/UI.md.
// Variant C — "Data table": every mode as a dense row (name, description,
// price, ETA) grouped under sticky category headers in one scrollable list,
// no cards, no sidebar. The total/CTA is the table's own last row, not a
// separate panel — closer to a spreadsheet or an airline fare table than a
// picker UI.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { CheckoutIngameStep, type IngameIdentity } from "@/components/checkout/CheckoutIngameStep";
import { BOOKING_CATEGORIES, type BookingOption } from "@/lib/bookingOptions";
import { PriceTag } from "@/components/currency/PriceTag";
import type { Game } from "@/lib/games";

export function BookingVariantC({ game }: { game: Game }) {
  const router = useRouter();
  const { status } = useSession();
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
    <div className="proto-c">
      <div className="proto-c__table">
        <div className="proto-c__head-row">
          <span>Mode</span>
          <span>Description</span>
          <span>ETA</span>
          <span>Price</span>
        </div>
        <div className="proto-c__scroll">
          {BOOKING_CATEGORIES.map((cat) => (
            <div key={cat.category}>
              <div className="proto-c__cat-head">{cat.category}</div>
              {cat.options.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className={`proto-c__row${selected.name === option.name ? " is-selected" : ""}`}
                  onClick={() => setSelected(option)}
                >
                  <span className="proto-c__row-name">
                    {selected.name === option.name && <i className="fa-solid fa-check" aria-hidden="true" />}
                    {option.name}
                  </span>
                  <span className="proto-c__row-desc">{option.description}</span>
                  <span className="proto-c__row-eta">{option.eta}</span>
                  <span className="proto-c__row-price">
                    <PriceTag amountEUR={option.price} /> <small>{option.unit}</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="proto-c__foot-row">
          <span className="proto-c__foot-game">
            {game.name} · {selected.name}
          </span>
          <span className="proto-c__foot-stepper">
            Teammates
            <div className="booking-stepper">
              <button type="button" onClick={() => setGroupSize((n) => Math.max(1, n - 1))} disabled={groupSize <= 1}>
                <i className="fa-solid fa-minus" aria-hidden="true" />
              </button>
              <span className="booking-stepper__value">{groupSize}</span>
              <button type="button" onClick={() => setGroupSize((n) => Math.min(4, n + 1))} disabled={groupSize >= 4}>
                <i className="fa-solid fa-plus" aria-hidden="true" />
              </button>
            </div>
          </span>
          <span className="proto-c__foot-total">
            Total <PriceTag amountEUR={total} />
          </span>
          <button type="button" className="btn btn--vivid" onClick={() => setIngameOpen(true)}>
            Continue to checkout
          </button>
        </div>
      </div>

      <Modal open={ingameOpen} onClose={() => setIngameOpen(false)} labelledBy="proto-c-ingame-title">
        <div className="ingame-modal">
          <CheckoutIngameStep
            headingId="proto-c-ingame-title"
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
