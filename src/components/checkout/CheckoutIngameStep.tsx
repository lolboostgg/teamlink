"use client";

import { useEffect, useId, useRef, useState, useTransition, type CSSProperties } from "react";
import { getGameProfileConfig } from "@/lib/gameProfiles";
import { regionsForGame, ignPlaceholder, ignHint, type RegionOption } from "@/lib/gameRegions";
import { DIVISIONS, ranksForGame, rankHasDivisions, formatRank } from "@/lib/gameRanks";
import { listGameAccounts, saveGameAccount, type GameAccountView } from "@/app/actions/gameAccounts";

// Same dropdown shape as SearchablePayoutSelect (VerificationEditor.tsx) —
// a native <select> can't be themed to match the dark popover the rest of
// this modal uses, and its open-state rendering is whatever the OS gives it.
// No search box here: the region list per game tops out around ten entries.
function RegionSelect({ value, options, onChange }: { value: string; options: RegionOption[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className={`payout-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="payout-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected ? `${selected.label} (${selected.value})` : "Select a region"}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>
      {open && (
        <div className="payout-select__popover">
          <ul id={listId} role="listbox">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.value}</small>
                  </span>
                  {option.value === value && <i className="fa-solid fa-check" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Each tier gets its own color instead of one flat neutral tile for all
// eleven ranks — matches the metal/gem each rank is actually named after,
// so the grid reads as a real ladder instead of a plain list with icons.
const RANK_COLORS: Record<string, string> = {
  unranked: "#8b8fa3",
  iron: "#8c7a6b",
  bronze: "#c17a4d",
  silver: "#adb7c4",
  gold: "#e8b93f",
  platinum: "#3fd6b8",
  emerald: "#2ecc71",
  diamond: "#4aa8ff",
  master: "#b366ff",
  grandmaster: "#ff4d6d",
  challenger: "#ffd76a",
  radiant: "#ffd76a",
  immortal: "#ff4d6d",
  predator: "#ff4d6d",
  champion: "#b366ff",
};

export interface IngameIdentity {
  ign: string;
  region: string;
  roles: string[];
  rank: string | null;
  division: string | null;
}

interface Props {
  gameSlug: string;
  gameName: string;
  /** Guests can fill the form but have nowhere to save it to. */
  canSave: boolean;
  onContinue: (identity: IngameIdentity) => void;
  onBack: () => void;
  backLabel?: string;
  continueLabel?: string;
  /** Lets a dialog point aria-labelledby at this step's own heading. */
  headingId?: string;
}

/**
 * Who the teammate is adding, asked before payment.
 *
 * A signed-in customer picks from the accounts they already saved; a guest
 * just fills the form, and the answer rides along on the order either way.
 */
export function CheckoutIngameStep({
  gameSlug,
  gameName,
  canSave,
  onContinue,
  onBack,
  backLabel = "Back",
  continueLabel = "Continue to payment",
  headingId,
}: Props) {
  const roleOptions = getGameProfileConfig(gameSlug)?.roles;
  const regions = regionsForGame(gameSlug);
  const rankOptions = ranksForGame(gameSlug);

  const [saved, setSaved] = useState<GameAccountView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(!canSave);
  const [ign, setIgn] = useState("");
  const [region, setRegion] = useState(regions[0]?.value ?? "");
  const [roles, setRoles] = useState<string[]>([]);
  const [rank, setRank] = useState<string | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!canSave) return;
    let cancelled = false;
    listGameAccounts(gameSlug)
      .then((rows) => {
        if (cancelled) return;
        setSaved(rows);
        // Nothing saved yet means the form is the only thing to show.
        if (rows.length === 0) setAdding(true);
        else setSelectedId(rows[0].id);
      })
      .catch(() => setAdding(true));
    return () => {
      cancelled = true;
    };
  }, [canSave, gameSlug]);

  function toggleRole(value: string) {
    setRoles((current) => (current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]));
  }

  function continueWithSelected() {
    const account = saved.find((entry) => entry.id === selectedId);
    if (!account) {
      setError("Pick an account or add a new one.");
      return;
    }
    onContinue({
      ign: account.ign,
      region: account.region,
      roles: account.roles,
      rank: account.rank,
      division: account.division,
    });
  }

  function continueWithForm() {
    setError(null);
    if (!ign.trim()) {
      setError("Enter your in-game name.");
      return;
    }
    if (!region) {
      setError("Pick your server or region.");
      return;
    }

    const identity: IngameIdentity = {
      ign: ign.trim(),
      region,
      roles,
      rank,
      // Apex tiers and Unranked have no sub-division to send.
      division: rankHasDivisions(rank) ? division : null,
    };

    // Guests have nowhere to save it — the order still carries it.
    if (!canSave) {
      onContinue(identity);
      return;
    }

    startTransition(async () => {
      try {
        await saveGameAccount({ gameSlug, ...identity });
      } catch {
        // Saving is a convenience; a failure must not block the booking.
      }
      onContinue(identity);
    });
  }

  const accentColor = (rank && RANK_COLORS[rank]) || "var(--accent)";

  return (
    <div className="checkout-card ingame-step" style={{ "--rank-color": accentColor } as CSSProperties}>
      <div className="ingame-step__head">
        <h2 id={headingId}>
          <i className="fa-solid fa-user-check" aria-hidden="true" /> In-game information
        </h2>
        <p>So your teammate knows who to add in {gameName}.</p>
      </div>

      {canSave && saved.length > 0 && !adding && (
        <>
          <div className="ingame-accounts">
            {saved.map((account) => (
              <label key={account.id} className={`ingame-account${selectedId === account.id ? " is-active" : ""}`}>
                <input
                  type="radio"
                  name="ingame-account"
                  checked={selectedId === account.id}
                  onChange={() => setSelectedId(account.id)}
                />
                <span className="ingame-account__mark" aria-hidden="true" />
                <span className="ingame-account__copy">
                  <strong>{account.ign}</strong>
                  <small>
                    {account.region}
                    {formatRank(gameSlug, account.rank, account.division) &&
                      ` · ${formatRank(gameSlug, account.rank, account.division)}`}
                    {account.roles.length > 0 && ` · ${account.roles.map(labelForRole(gameSlug)).join(", ")}`}
                  </small>
                </span>
              </label>
            ))}
          </div>

          <button type="button" className="ingame-step__add" onClick={() => setAdding(true)}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Add another account
          </button>
        </>
      )}

      {(adding || saved.length === 0) && (
        <>
          <div className="ingame-step__identity">
            <div className="form-row">
              <label htmlFor="ingame-name">In-game username</label>
              <input
                id="ingame-name"
                value={ign}
                onChange={(event) => setIgn(event.target.value)}
                placeholder={ignPlaceholder(gameSlug)}
                autoComplete="off"
              />
              <small className="form-row__note">{ignHint(gameSlug)}</small>
            </div>

            <div className="form-row">
              <label>Server / region</label>
              <RegionSelect value={region} options={regions} onChange={setRegion} />
            </div>
          </div>

          <div className="ingame-step__columns">
            {rankOptions.length > 0 && (
              <div className="form-row ingame-step__col-main">
                <label>Current rank</label>
                {/* A grid rather than a dropdown: eleven icon-led options fit
                    on screen at once, and an overlay list would be clipped by
                    this dialog's own scrolling. */}
                <div className="ingame-ranks" role="group" aria-label="Current rank">
                  {rankOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`ingame-rank${rank === option.value ? " is-active" : ""}`}
                      style={{ "--rank-color": RANK_COLORS[option.value] ?? "var(--accent)" } as CSSProperties}
                      aria-pressed={rank === option.value}
                      onClick={() => {
                        setRank(option.value);
                        if (!rankHasDivisions(option.value)) setDivision(null);
                      }}
                    >
                      {option.icon && (
                        <span className="ingame-rank__icon">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={option.icon} alt="" />
                        </span>
                      )}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
                {rankHasDivisions(rank) && (
                  <div className="ingame-divisions" role="group" aria-label="Division">
                    {DIVISIONS.map((entry) => (
                      <button
                        key={entry}
                        type="button"
                        className={`ingame-division${division === entry ? " is-active" : ""}`}
                        onClick={() => setDivision(entry)}
                      >
                        {entry}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="ingame-step__col-side">
              {roleOptions && (
                <div className="form-row">
                  <label>Preferred {roleOptions.label.toLowerCase()} (optional)</label>
                  <div className="chip-check-group ingame-step__lanes">
                    {roleOptions.options.map((option) => (
                      <label key={option.value} className={`chip-check${option.icon ? " chip-check--avatar" : ""}`}>
                        <input
                          type="checkbox"
                          checked={roles.includes(option.value)}
                          onChange={() => toggleRole(option.value)}
                        />
                        {option.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={option.icon} alt="" className="chip-check__icon" />
                        ) : option.glyph ? (
                          <i className={`${option.glyph} chip-check__glyph`} aria-hidden="true" />
                        ) : null}
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {!canSave && (
                <p className="ingame-step__guest">
                  <i className="fa-regular fa-circle-user" aria-hidden="true" />
                  Checking out as a guest &mdash; create an account afterwards to keep this for next time.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="form-row__error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="ingame-step__actions">
        <button type="button" className="btn btn--ghost" onClick={onBack} disabled={pending}>
          {backLabel}
        </button>
        {adding || saved.length === 0 ? (
          <button type="button" className="btn btn--vivid" onClick={continueWithForm} disabled={pending}>
            {pending ? "Saving…" : continueLabel}
          </button>
        ) : (
          <button type="button" className="btn btn--vivid" onClick={continueWithSelected}>
            {continueLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Role values are stored as slugs; the registry holds the display labels. */
function labelForRole(gameSlug: string) {
  const options = getGameProfileConfig(gameSlug)?.roles?.options ?? [];
  return (value: string) => options.find((option) => option.value === value)?.label ?? value;
}
