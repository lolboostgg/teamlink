"use client";

import { useEffect, useState, useTransition } from "react";
import { getGameProfileConfig } from "@/lib/gameProfiles";
import { regionsForGame, ignPlaceholder, ignHint } from "@/lib/gameRegions";
import { DIVISIONS, ranksForGame, rankHasDivisions, formatRank } from "@/lib/gameRanks";
import { listGameAccounts, saveGameAccount, type GameAccountView } from "@/app/actions/gameAccounts";

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

  return (
    <div className="checkout-card ingame-step">
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
              <label htmlFor="ingame-region">Server / region</label>
              <select id="ingame-region" value={region} onChange={(event) => setRegion(event.target.value)}>
                {regions.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label} ({entry.value})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rankOptions.length > 0 && (
            <div className="form-row form-row--section">
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
                    aria-pressed={rank === option.value}
                    onClick={() => {
                      setRank(option.value);
                      if (!rankHasDivisions(option.value)) setDivision(null);
                    }}
                  >
                    {option.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={option.icon} alt="" />
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

          {roleOptions && (
            <div className="form-row form-row--section">
              <label>Preferred {roleOptions.label.toLowerCase()} (optional)</label>
              <div className="chip-check-group">
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
