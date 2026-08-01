"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/games";
import { BOOKING_CATEGORIES, type BookingOption } from "@/lib/bookingOptions";

interface Props {
  game: Game;
}

export function BookingWidget({ game }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<BookingOption>(BOOKING_CATEGORIES[0].options[0]);
  const [teammates, setTeammates] = useState(1);

  const total = useMemo(() => selected.price * teammates, [selected, teammates]);

  function goToCheckout() {
    const params = new URLSearchParams({
      game: game.slug,
      option: selected.name,
      teammates: String(teammates),
      total: total.toFixed(2),
    });
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="booking-layout">
      <div>
        <div className="booking-header">
          <div
            className="booking-header__cover"
            style={{
              backgroundColor: game.tint,
              backgroundImage: `url(${game.bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div>
            <h1>{game.name}</h1>
            <p>{game.players} players matched so far</p>
          </div>
        </div>

        {BOOKING_CATEGORIES.map((cat) => (
          <div className="booking-category" key={cat.category}>
            <div className="booking-category__title">{cat.category}</div>
            {cat.options.map((option) => (
              <button
                key={option.name}
                type="button"
                className={`booking-option${selected.name === option.name ? " is-selected" : ""}`}
                onClick={() => setSelected(option)}
              >
                <span className="booking-option__main">
                  <span className="booking-option__radio" />
                  <span>
                    <span className="booking-option__name">{option.name}</span>
                    <br />
                    <span className="booking-option__desc">{option.description}</span>
                  </span>
                </span>
                <span className="booking-option__price">
                  <span className="booking-option__price-value">
                    ${option.price.toFixed(2)}
                    {option.unit}
                  </span>
                  <br />
                  <span className="booking-option__eta">{option.eta}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

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
        <div className="booking-sidebar__row">
          <span>Teammates</span>
          <div className="booking-stepper">
            <button type="button" onClick={() => setTeammates((n) => Math.max(1, n - 1))} aria-label="Decrease">
              <i className="fa-solid fa-minus" aria-hidden="true" />
            </button>
            <span>{teammates}</span>
            <button type="button" onClick={() => setTeammates((n) => Math.min(4, n + 1))} aria-label="Increase">
              <i className="fa-solid fa-plus" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="booking-sidebar__total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <button type="button" className="btn btn--primary btn--block" onClick={goToCheckout}>
          Continue to checkout
        </button>
      </aside>
    </div>
  );
}
