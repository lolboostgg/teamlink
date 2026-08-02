"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FieldSelect } from "@/components/ui/FieldSelect";
import { getTeammatesForGame } from "@/lib/teammates";
import { RANK_TIERS, type LolRankTier } from "@/lib/lolAssets";
import { TeammateCard } from "@/components/booking/TeammateCard";

interface Props {
  open: boolean;
  onClose: () => void;
  gameSlug: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const MIN_RATING_OPTIONS = [
  { value: "0", label: "Any" },
  { value: "4.5", label: "4.5+" },
  { value: "4.8", label: "4.8+" },
  { value: "4.9", label: "4.9+" },
];

const RANK_ORDER = RANK_TIERS.map((r) => r.tier);

// One modal picks every slot in the group at once — selectedIds has one
// entry per slot ("random" for open ones); clicking a teammate fills the
// first open slot, clicking a filled one frees it back to random, so you
// never have to reopen this per slot. Filters (left) only act on real
// teammates, not the always-available Random match card.
export function TeammateModal({ open, onClose, gameSlug, selectedIds, onChange }: Props) {
  const teammates = getTeammatesForGame(gameSlug);
  const [query, setQuery] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [minRank, setMinRank] = useState("any");

  const pickedCount = selectedIds.filter((id) => id !== "random").length;
  const allRandom = pickedCount === 0;

  // Only games whose teammates actually carry a rank (League of Legends,
  // right now) show this filter — an empty/meaningless dropdown is worse
  // than no dropdown.
  const rankOptions = useMemo(() => {
    const present = new Set(teammates.map((t) => t.lolRank).filter((r): r is LolRankTier => !!r));
    if (present.size === 0) return null;
    const tiers = RANK_ORDER.filter((tier) => present.has(tier));
    return [
      { value: "any", label: "Any" },
      ...tiers.map((tier) => ({ value: tier, label: `${RANK_TIERS.find((r) => r.tier === tier)!.label}+` })),
    ];
  }, [teammates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minRatingNum = Number(minRating);
    const minRankIndex = minRank === "any" ? -1 : RANK_ORDER.indexOf(minRank as LolRankTier);
    return teammates.filter((t) => {
      if (t.rating < minRatingNum) return false;
      if (minRankIndex >= 0) {
        const rankIndex = t.lolRank ? RANK_ORDER.indexOf(t.lolRank) : -1;
        if (rankIndex < minRankIndex) return false;
      }
      if (q && !t.name.toLowerCase().includes(q) && !t.tagline.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [teammates, query, minRating, minRank]);

  function toggle(id: string) {
    const slot = selectedIds.indexOf(id);
    if (slot !== -1) {
      // Already assigned to a slot — free it back to random.
      const next = [...selectedIds];
      next[slot] = "random";
      onChange(next);
      return;
    }
    const openSlot = selectedIds.indexOf("random");
    if (openSlot === -1) return; // every slot already has a specific pick
    const next = [...selectedIds];
    next[openSlot] = id;
    onChange(next);
  }

  function resetToRandom() {
    onChange(selectedIds.map(() => "random"));
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="teammate-modal-title">
      <div className="teammate-modal">
        <div className="teammate-modal__filters">
          <div className="teammate-modal__filters-title">Filters</div>

          <div className="form-row">
            <label htmlFor="teammate-search">Search</label>
            <input
              id="teammate-search"
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <FieldSelect label="Minimum rating" value={minRating} options={MIN_RATING_OPTIONS} onChange={setMinRating} />

          {rankOptions && <FieldSelect label="Rank" value={minRank} options={rankOptions} onChange={setMinRank} />}
        </div>

        <div className="teammate-modal__content">
          <div className="teammate-modal__head">
            <div>
              <h2 id="teammate-modal-title" className="teammate-modal__title">
                Choose your teammates
              </h2>
              <p className="teammate-modal__sub">
                {selectedIds.length > 1
                  ? `Pick up to ${selectedIds.length} teammates — ${pickedCount} of ${selectedIds.length} selected.`
                  : "Pick a specific teammate, or let us match you with the fastest one available."}
              </p>
            </div>
            {selectedIds.length > 1 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={resetToRandom} disabled={allRandom}>
                Reset to random
              </button>
            )}
          </div>

          <div className="teammate-modal__grid">
            <button
              type="button"
              className={`teammate-card teammate-card--random${allRandom ? " is-selected" : ""}`}
              onClick={resetToRandom}
            >
              <div className="teammate-card__banner teammate-card__banner--random">
                {allRandom && <i className="fa-solid fa-check teammate-card__check" aria-hidden="true" />}
              </div>
              <div className="teammate-card__body">
                <span className="teammate-card__avatar teammate-card__avatar--random">
                  <i className="fa-solid fa-shuffle" aria-hidden="true" />
                </span>
                <div className="teammate-card__head teammate-card__head--random">
                  <span className="teammate-card__name">Random match</span>
                </div>
                <p className="teammate-card__tagline">Fastest available teammate(s), recommended for the quickest match.</p>
              </div>
            </button>

            {filtered.map((t) => {
              const slot = selectedIds.indexOf(t.id);
              return (
                <TeammateCard
                  key={t.id}
                  teammate={t}
                  gameSlug={gameSlug}
                  selected={slot !== -1}
                  slotNumber={selectedIds.length > 1 && slot !== -1 ? slot + 1 : undefined}
                  onSelect={() => toggle(t.id)}
                />
              );
            })}

            {filtered.length === 0 && teammates.length > 0 && (
              <p className="teammate-modal__empty">No teammates match those filters.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
