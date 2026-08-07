"use client";

// THROWAWAY — see .claude/skills/prototype/UI.md.
// Variant A — "Comparison grid": every mode is a card in one grid (no tabs,
// nothing hidden), category shown as a colored pill on each card instead of
// grouping into sections. Order summary isn't a side panel — it's a slim
// bar pinned to the bottom of the viewport, freeing the whole page for the
// grid instead of splitting width with a tall sidebar.

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { CheckoutIngameStep, type IngameIdentity } from "@/components/checkout/CheckoutIngameStep";
import { BOOKING_CATEGORIES, type BookingOption } from "@/lib/bookingOptions";
import { PriceTag } from "@/components/currency/PriceTag";
import type { Game } from "@/lib/games";

const CATEGORY_COLORS: Record<string, string> = {
  "Team Up": "var(--accent)",
  Ranked: "var(--hue-gold)",
  Social: "var(--hue-pink)",
  Coaching: "var(--hue-purple)",
};

const ALL_OPTIONS = BOOKING_CATEGORIES.flatMap((cat) => cat.options.map((option) => ({ ...option, category: cat.category })));

export function BookingVariantA({ game }: { game: Game }) {
  const router = useRouter();
  const { status } = useSession();
  const [selected, setSelected] = useState<BookingOption & { category: string }>(ALL_OPTIONS[0]);
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
    <div className="proto-a">
      <div className="proto-a__grid">
        {ALL_OPTIONS.map((option) => {
          const isSelected = option.name === selected.name;
          return (
            <button
              key={option.name}
              type="button"
              className={`proto-a__card${isSelected ? " is-selected" : ""}`}
              style={{ "--cat-color": CATEGORY_COLORS[option.category] ?? "var(--accent)" } as CSSProperties}
              onClick={() => setSelected(option)}
            >
              <span className="proto-a__card-cat">{option.category}</span>
              <span className="proto-a__card-name">{option.name}</span>
              <span className="proto-a__card-desc">{option.description}</span>
              <span className="proto-a__card-foot">
                <span className="proto-a__card-price">
                  <PriceTag amountEUR={option.price} /> <small>{option.unit}</small>
                </span>
                <span className="proto-a__card-eta">{option.eta}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="proto-a__bar">
        <div className="proto-a__bar-info">
          <strong>{game.name}</strong>
          <span>{selected.name}</span>
        </div>
        <div className="proto-a__bar-stepper">
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
        <div className="proto-a__bar-total">
          <span>Total</span>
          <PriceTag amountEUR={total} />
        </div>
        <button type="button" className="btn btn--vivid" onClick={() => setIngameOpen(true)}>
          Continue to checkout
        </button>
      </div>

      <Modal open={ingameOpen} onClose={() => setIngameOpen(false)} labelledBy="proto-a-ingame-title">
        <div className="ingame-modal">
          <CheckoutIngameStep
            headingId="proto-a-ingame-title"
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
