"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
const GROUP_SIZES = Array.from({ length: MAX_TEAMMATES }, (_, i) => i + 1);

// Which specific teammate you get is decided by the live dispatch/pick flow
// after checkout (see MatchmakingScreen), not up front — this widget only
// books the game, mode and group size.
export function BookingWidget({ game }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<BookingOption>(BOOKING_CATEGORIES[0].options[0]);
  const [groupSize, setGroupSize] = useState(1);
  const [pulsing, setPulsing] = useState(false);
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

  function goToCheckout() {
    const params = new URLSearchParams({
      game: game.slug,
      option: selected.name,
      teammates: String(groupSize),
      total: total.toFixed(2),
    });
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

        {BOOKING_CATEGORIES.map((cat, ci) => (
          <Reveal key={cat.category} delay={ci * 70}>
            <div className="booking-category">
              <div className="booking-category__title">{cat.category}</div>
              {cat.options.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className={`booking-option${selected.name === option.name ? " is-selected" : ""}`}
                  onClick={() => setSelected(option)}
                >
                  <span className="booking-option__icon">
                    <i className={CATEGORY_ICONS[cat.category] ?? "fa-solid fa-gamepad"} aria-hidden="true" />
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
        ))}

        <Reveal delay={90}>
          <div className="booking-category">
            <div className="booking-category__title">How many teammates</div>
            <div className="booking-group-size">
              {GROUP_SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`booking-group-size__pill${n === groupSize ? " is-selected" : ""}`}
                  onClick={() => setGroupSize(n)}
                >
                  {n}
                </button>
              ))}
            </div>
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
            <span>{groupSize}</span>
          </div>

          <div className={`booking-sidebar__total${pulsing ? " is-pulsing" : ""}`}>
            <span>Total</span>
            <PriceTag amountEUR={total} />
          </div>

          <button type="button" className="btn btn--vivid btn--block" onClick={goToCheckout}>
            Continue to checkout
          </button>
        </aside>

        <TrustPoints />
      </div>
    </div>
  );
}
