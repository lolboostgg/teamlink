import type { Teammate } from "@/lib/teammates";

interface Props {
  selected: Teammate[];
  multiPick: boolean;
  teammatesNeeded: number;
  hasWinner: boolean;
  onConfirm: () => void;
  onUseAutoSelect: () => void;
}

export function SelectionConfirmationBar({
  selected,
  multiPick,
  teammatesNeeded,
  hasWinner,
  onConfirm,
  onUseAutoSelect,
}: Props) {
  const confirmLabel = multiPick ? `Confirm team (${selected.length}/${teammatesNeeded})` : "Confirm teammate";
  const confirmDisabled = multiPick ? selected.length === 0 : selected.length !== 1;

  return (
    <div className="selection-bar">
      <div className="selection-bar__picked">
        {selected.length === 0 ? (
          <span className="selection-bar__empty">No one selected yet — pick a card, or use auto-select.</span>
        ) : (
          <>
            <div className="selection-bar__avatars">
              {selected.map((t) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={t.id} src="/avatars/default.webp" alt="" className="selection-bar__avatar" />
              ))}
            </div>
            <div className="selection-bar__names">
              <span className="selection-bar__name">{selected.map((t) => t.name).join(", ")}</span>
              <span className="selection-bar__hint">You can change your pick while the timer is running.</span>
            </div>
          </>
        )}
      </div>

      <div className="selection-bar__actions">
        {hasWinner && (
          <button type="button" className="btn btn--ghost" onClick={onUseAutoSelect}>
            Use auto-select
          </button>
        )}
        <button type="button" className="btn btn--vivid" onClick={onConfirm} disabled={confirmDisabled}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
