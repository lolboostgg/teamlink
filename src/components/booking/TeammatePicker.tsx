"use client";

import { useRef } from "react";
import { getTeammatesForGame } from "@/lib/teammates";
import { TeammateCard } from "@/components/booking/TeammateCard";

interface Props {
  gameSlug: string;
  selected: string;
  onChange: (id: string) => void;
}

// Horizontal carousel instead of a wrapping grid — matches the game
// picker's visual language (see GameSwitcherBar/.hero-carousel) so this
// step reads as part of the same page instead of a bolted-on component.
export function TeammatePicker({ gameSlug, selected, onChange }: Props) {
  const teammates = getTeammatesForGame(gameSlug);
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(delta: number) {
    trackRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div className="teammate-carousel">
      <div className="teammate-carousel__track" ref={trackRef}>
        <button
          type="button"
          className={`teammate-chip teammate-chip--random${selected === "random" ? " is-selected" : ""}`}
          onClick={() => onChange("random")}
        >
          {selected === "random" && <i className="fa-solid fa-check teammate-chip__check" aria-hidden="true" />}
          <span className="teammate-chip__avatar teammate-chip__avatar--random">
            <i className="fa-solid fa-shuffle" aria-hidden="true" />
          </span>
          <span className="teammate-chip__name">Random match</span>
          <span className="teammate-chip__tagline">Fastest available teammate, recommended for the quickest match.</span>
        </button>

        {teammates.map((t) => (
          <TeammateCard key={t.id} teammate={t} selected={selected === t.id} onSelect={() => onChange(t.id)} />
        ))}
      </div>

      <button
        type="button"
        className="hero-carousel__prev teammate-carousel__prev"
        onClick={() => scrollBy(-220)}
        aria-label="Show previous teammates"
      >
        <i className="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="hero-carousel__next teammate-carousel__next"
        onClick={() => scrollBy(220)}
        aria-label="Show more teammates"
      >
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
