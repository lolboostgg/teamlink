"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { gameIcon } from "@/lib/gameArt";

interface Props {
  game: Game;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Team Up": "fa-solid fa-user-group",
  Ranked: "fa-solid fa-trophy",
  Social: "fa-solid fa-comments",
  Coaching: "fa-solid fa-chalkboard-user",
};

// Each category gets its own accent instead of every option card looking
// identical bar the price — same curated hue set already used for icon
// badges elsewhere in the design system (see globals.css :root comment).
const CATEGORY_COLORS: Record<string, string> = {
  "Team Up": "var(--accent)",
  Ranked: "var(--hue-gold)",
  Social: "var(--hue-pink)",
  Coaching: "var(--hue-purple)",
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
          <span className="section__eyebrow booking-heading__eyebrow">Book a session</span>
        </Reveal>
        <Reveal delay={10}>
          <h2 className="section__title booking-heading__title">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gameIcon(game.slug)} alt="" className="booking-heading__game-icon" />
            Choose your mode
          </h2>
        </Reveal>

        <Reveal delay={20}>
          <span className="booking-live-badge">
            <span className="pulse-dot" aria-hidden="true" /> ~1 min average wait right now
          </span>
        </Reveal>

        <Reveal delay={30}>
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
          <div
            className="booking-category"
            style={{ "--cat-color": CATEGORY_COLORS[visibleCategory.category] ?? "var(--accent)" } as CSSProperties}
          >
            {visibleCategory.options.map((option) => (
              <button
                key={option.name}
                type="button"
                className={`booking-option${selected.name === option.name ? " is-selected" : ""}`}
                onClick={() => setSelected(option)}
              >
                {selected.name === option.name && (
                  <span className="booking-option__check" aria-hidden="true">
                    <i className="fa-solid fa-check" />
                  </span>
                )}
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
                  <span className="booking-option__eta">
                    <span className="booking-option__eta-dot" aria-hidden="true" />
                    {option.eta}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="booking-sidebar-wrap">
        <aside className="booking-sidebar">
          <div className="booking-sidebar__summary">
            <span className="booking-sidebar__summary-game">{game.name}</span>
            <span className="booking-sidebar__summary-option">{selected.name}</span>
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

        <TrustPoints compact />
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
