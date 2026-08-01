"use client";

import { Modal } from "@/components/ui/Modal";
import { getTeammatesForGame } from "@/lib/teammates";
import { TeammateCard } from "@/components/booking/TeammateCard";

interface Props {
  open: boolean;
  onClose: () => void;
  gameSlug: string;
  selected: string;
  onChange: (id: string) => void;
}

// Picking a specific teammate used to be a permanent, full-width carousel
// section on the booking page — moved into a modal (triggered from the
// sidebar's Teammate row) so the main flow stays short; "random match" is
// the default, this is only for people who want to pick.
export function TeammateModal({ open, onClose, gameSlug, selected, onChange }: Props) {
  const teammates = getTeammatesForGame(gameSlug);

  function choose(id: string) {
    onChange(id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="teammate-modal-title">
      <div className="teammate-modal">
        <h2 id="teammate-modal-title" className="teammate-modal__title">
          Choose your teammate
        </h2>
        <p className="teammate-modal__sub">Pick a specific teammate, or let us match you with the fastest one available.</p>

        <div className="teammate-modal__grid">
          <button
            type="button"
            className={`teammate-chip teammate-chip--random${selected === "random" ? " is-selected" : ""}`}
            onClick={() => choose("random")}
          >
            {selected === "random" && <i className="fa-solid fa-check teammate-chip__check" aria-hidden="true" />}
            <span className="teammate-chip__avatar teammate-chip__avatar--random">
              <i className="fa-solid fa-shuffle" aria-hidden="true" />
            </span>
            <span className="teammate-chip__name">Random match</span>
            <span className="teammate-chip__tagline">Fastest available teammate, recommended for the quickest match.</span>
          </button>

          {teammates.map((t) => (
            <TeammateCard key={t.id} teammate={t} selected={selected === t.id} onSelect={() => choose(t.id)} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
