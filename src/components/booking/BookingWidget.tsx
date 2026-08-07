"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { CheckoutIngameStep, type IngameIdentity } from "@/components/checkout/CheckoutIngameStep";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/games";
import { BOOKING_CATEGORIES, type BookingOption } from "@/lib/bookingOptions";
import { Reveal } from "@/components/ui/Reveal";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PriceTag } from "@/components/currency/PriceTag";
import { TrustPoints } from "@/components/ui/TrustPoints";

interface Props {
  game: Game;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Team Up": "fa-solid fa-user-group",
  Ranked: "fa-solid fa-trophy",
  Social: "fa-solid fa-comments",
  Coaching: "fa-solid fa-chalkboard-user",
};

// Flat cap for now — per-game-mode limits (e.g. Duo Normal maxes at 1,
// Ranked 5s allows up to 4) are a future admin-dashboard setting, not
// modeled yet.
const MAX_TEAMMATES = 4;

// Which specific teammate you get is decided by the live dispatch/pick flow
// after checkout (see MatchmakingScreen), not up front — this widget only
// books the game, mode and group size.
export function BookingWidget({ game }: Props) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(BOOKING_CATEGORIES[0].category);
  const [selected, setSelected] = useState<BookingOption>(BOOKING_CATEGORIES[0].options[0]);
  const [groupSize, setGroupSize] = useState(1);
  const visibleCategory = BOOKING_CATEGORIES.find((cat) => cat.category === activeCategory) ?? BOOKING_CATEGORIES[0];
  const [pulsing, setPulsing] = useState(false);
  const [ingameOpen, setIngameOpen] = useState(false);
  const { status } = useSession();
  const firstRender = useRef(true);

  const total = useMemo(() => selected.price * groupSize, [selected, groupSize]);

  // Small "flash" on the total whenever the selection changes, so the price
  // update reads as live/reactive rather than just appearing.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 260);
    return () => clearTimeout(t);
  }, [total]);

  // The in-game details are asked here rather than mid-checkout: it is the
  // one thing the customer has to look up, and finding out about it after
  // committing to a price is where people drop out.
  function goToCheckout(ingame?: IngameIdentity) {
    const params = new URLSearchParams({
      game: game.slug,
      option: selected.name,
      teammates: String(groupSize),
      total: total.toFixed(2),
    });
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
    <div className="booking-layout">
      <div>
        <Reveal>
          <span className="booking-live-badge">
            <span className="pulse-dot" aria-hidden="true" /> ~1 min average wait right now
          </span>
        </Reveal>

        <Reveal delay={20}>
          <div className="booking-tabs" role="tablist">
            {BOOKING_CATEGORIES.map((cat) => (
              <button
                key={cat.category}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.category}
                className={`booking-tabs__tab${activeCategory === cat.category ? " is-active" : ""}`}
                onClick={() => setActiveCategory(cat.category)}
              >
                <i className={CATEGORY_ICONS[cat.category] ?? "fa-solid fa-gamepad"} aria-hidden="true" />
                {cat.category}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal key={visibleCategory.category} delay={40}>
          <div className="booking-category">
            {visibleCategory.options.map((option) => (
              <button
                key={option.name}
                type="button"
                className={`booking-option${selected.name === option.name ? " is-selected" : ""}`}
                onClick={() => setSelected(option)}
              >
                <span className="booking-option__icon">
                  <i className={CATEGORY_ICONS[visibleCategory.category] ?? "fa-solid fa-gamepad"} aria-hidden="true" />
                </span>
                <span className="booking-option__main">
                  <span className="booking-option__name">
                    {option.name}
                    <InfoTooltip text={option.description} />
                  </span>
                  <span className="booking-option__desc">{option.description}</span>
                </span>
                <span className="booking-option__price">
                  <span className="booking-option__price-value">
                    <PriceTag amountEUR={option.price} />
                    <span className="booking-option__unit">{option.unit}</span>
                  </span>
                  <span className="booking-option__eta">{option.eta}</span>
                </span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="booking-sidebar-wrap">
        <aside className="booking-sidebar">
          <div className="booking-sidebar__title">Your session</div>

          <div className="booking-sidebar__row">
            <span>Game</span>
            <span>{game.name}</span>
          </div>
          <div className="booking-sidebar__row">
            <span>Option</span>
            <span>{selected.name}</span>
          </div>
          <div className="booking-sidebar__row booking-sidebar__row--last">
            <span>Teammates</span>
            <span className="booking-stepper">
              <button
                type="button"
                onClick={() => setGroupSize((n) => Math.max(1, n - 1))}
                disabled={groupSize <= 1}
                aria-label="Fewer teammates"
              >
                <i className="fa-solid fa-minus" aria-hidden="true" />
              </button>
              <span className="booking-stepper__value">{groupSize}</span>
              <button
                type="button"
                onClick={() => setGroupSize((n) => Math.min(MAX_TEAMMATES, n + 1))}
                disabled={groupSize >= MAX_TEAMMATES}
                aria-label="More teammates"
              >
                <i className="fa-solid fa-plus" aria-hidden="true" />
              </button>
            </span>
          </div>

          <div className={`booking-sidebar__total${pulsing ? " is-pulsing" : ""}`}>
            <span>Total</span>
            <PriceTag amountEUR={total} />
          </div>

          <button type="button" className="btn btn--vivid btn--block" onClick={() => setIngameOpen(true)}>
            Continue to checkout
          </button>
        </aside>

        <TrustPoints />
      </div>

      <Modal open={ingameOpen} onClose={() => setIngameOpen(false)} labelledBy="booking-ingame-title">
        <div className="ingame-modal">
          <CheckoutIngameStep
            headingId="booking-ingame-title"
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
