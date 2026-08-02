"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/games";
import { BOOKING_CATEGORIES, type BookingOption } from "@/lib/bookingOptions";
import { Reveal } from "@/components/ui/Reveal";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PriceTag } from "@/components/currency/PriceTag";
import { TeammateModal } from "@/components/booking/TeammateModal";
import { TrustPoints } from "@/components/ui/TrustPoints";
import { TEAMMATES } from "@/lib/teammates";

interface Props {
  game: Game;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Team Up": "fa-solid fa-user-group",
  Ranked: "fa-solid fa-trophy",
  Social: "fa-solid fa-comments",
  Coaching: "fa-solid fa-chalkboard-user",
};

const MAX_TEAMMATES = 4;

function teammateName(id: string): string {
  return id === "random" ? "Random match" : TEAMMATES.find((t) => t.id === id)?.name ?? "Random match";
}

export function BookingWidget({ game }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<BookingOption>(BOOKING_CATEGORIES[0].options[0]);
  // One entry per teammate slot — length always matches group size, so
  // increasing it (e.g. to 3) opens up 2 more pickable slots instead of
  // one "teammate" choice silently applying to the whole group.
  const [teammateIds, setTeammateIds] = useState<string[]>(["random"]);
  const [pulsing, setPulsing] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const firstRender = useRef(true);

  const teammates = teammateIds.length;
  const total = useMemo(() => selected.price * teammates, [selected, teammates]);

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

  function setGroupSize(next: number) {
    const clamped = Math.max(1, Math.min(MAX_TEAMMATES, next));
    setTeammateIds((prev) => {
      if (clamped === prev.length) return prev;
      if (clamped > prev.length) return [...prev, ...Array(clamped - prev.length).fill("random")];
      return prev.slice(0, clamped);
    });
  }

  function handleTeammateChange(id: string) {
    if (editingSlot === null) return;
    setTeammateIds((prev) => prev.map((v, i) => (i === editingSlot ? id : v)));
  }

  function goToCheckout() {
    const params = new URLSearchParams({
      game: game.slug,
      option: selected.name,
      teammates: String(teammates),
      total: total.toFixed(2),
      teammate: teammateIds.join(","),
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

          {teammateIds.map((id, i) => (
            <button
              key={i}
              type="button"
              className="booking-sidebar__row booking-sidebar__row--action"
              onClick={() => setEditingSlot(i)}
            >
              <span>{teammateIds.length > 1 ? `Teammate ${i + 1}` : "Teammate"}</span>
              <span>
                {teammateName(id)}
                <i className="fa-solid fa-pen" aria-hidden="true" />
              </span>
            </button>
          ))}

          <div className="booking-sidebar__row booking-sidebar__row--last">
            <span>Group size</span>
            <div className="booking-stepper">
              <button type="button" onClick={() => setGroupSize(teammates - 1)} aria-label="Decrease">
                <i className="fa-solid fa-minus" aria-hidden="true" />
              </button>
              <span>{teammates}</span>
              <button type="button" onClick={() => setGroupSize(teammates + 1)} aria-label="Increase">
                <i className="fa-solid fa-plus" aria-hidden="true" />
              </button>
            </div>
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

      <TeammateModal
        open={editingSlot !== null}
        onClose={() => setEditingSlot(null)}
        gameSlug={game.slug}
        selected={editingSlot !== null ? teammateIds[editingSlot] : "random"}
        onChange={handleTeammateChange}
      />
    </div>
  );
}
