import { getTeammatesForGame } from "@/lib/teammates";
import { TeammateCard } from "@/components/booking/TeammateCard";

interface Props {
  gameSlug: string;
  selected: string;
  onChange: (id: string) => void;
}

export function TeammatePicker({ gameSlug, selected, onChange }: Props) {
  const teammates = getTeammatesForGame(gameSlug);

  return (
    <div className="teammate-picker">
      <div className="teammate-grid">
        <button
          type="button"
          className={`teammate-card teammate-card--random${selected === "random" ? " is-selected" : ""}`}
          onClick={() => onChange("random")}
        >
          {selected === "random" && <i className="fa-solid fa-check teammate-card__check" aria-hidden="true" />}
          <div className="teammate-card__random-icon">
            <i className="fa-solid fa-shuffle" aria-hidden="true" />
          </div>
          <div className="teammate-card__name">Random match</div>
          <p className="teammate-card__tagline">Fastest available teammate, recommended for the quickest match.</p>
        </button>

        {teammates.map((t) => (
          <TeammateCard key={t.id} teammate={t} selected={selected === t.id} onSelect={() => onChange(t.id)} />
        ))}
      </div>
    </div>
  );
}
