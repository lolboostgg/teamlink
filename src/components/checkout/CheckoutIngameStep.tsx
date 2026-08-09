"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getGameProfileConfig } from "@/lib/gameProfiles";
import { regionsForGame, ignPlaceholder, ignHint, type RegionOption } from "@/lib/gameRegions";
import { DIVISIONS, ranksForGame, rankHasDivisions, formatRank } from "@/lib/gameRanks";
import { listGameAccounts, saveGameAccount, type GameAccountView } from "@/app/actions/gameAccounts";
import { verifyRiotAccount } from "@/app/actions/riot";
import type { RiotLookupResult } from "@/lib/riotApi";

// Riot verification is a trial integration for League of Legends only —
// Valorant/TFT share the same Name#TAG account but League-V4 (the rank
// lookup) is LoL-specific, so this stays scoped until there's a reason to
// widen it.
const RIOT_VERIFY_GAMES = new Set(["league-of-legends"]);

// Matches LOL_VERSION in the main site's config. Pinned rather than fetched
// from versions.json each time, but it has to stay reasonably current: an
// icon added in a later patch simply 404s on an older version.
const DDRAGON_VERSION = "16.14.1";
function profileIconUrl(profileIconId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${profileIconId}.png`;
}

/** Renders the found / not_found / wrong_server outcome of an auto-verify lookup. */
function RiotResultCard({
  result,
  region,
  rankLabel,
}: {
  result: RiotLookupResult;
  region: string;
  rankLabel: string | null;
}) {
  if (result.status === "found") {
    return (
      <div className="riot-card riot-card--found">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profileIconUrl(result.profileIconId)} alt="" className="riot-card__avatar" loading="lazy" />
        <span className="riot-card__body">
          <strong className="riot-card__name">
            {result.gameName}#{result.tagLine}
          </strong>
          <span className="riot-card__meta">
            Level {result.summonerLevel} · {result.regionLabel}
            {rankLabel && ` · ${rankLabel}`}
          </span>
        </span>
        <span className="riot-card__badge">
          <i className="fa-solid fa-circle-check" aria-hidden="true" /> Verified
        </span>
      </div>
    );
  }

  const message =
    result.status === "wrong_server"
      ? `This Riot ID is on ${result.actualRegionLabel}, not ${region} — pick ${result.actualRegionLabel} as your server above.`
      : "No Riot ID with that name and tag — check the spelling, e.g. Faker#1234.";

  return (
    <div className="riot-card riot-card--warning">
      <i
        className={`fa-solid ${result.status === "wrong_server" ? "fa-triangle-exclamation" : "fa-magnifying-glass"} riot-card__icon`}
        aria-hidden="true"
      />
      <span className="riot-card__body">
        <strong className="riot-card__name">
          {result.status === "wrong_server" ? "Wrong server" : "Riot ID not found"}
        </strong>
        <span className="riot-card__meta">{message}</span>
      </span>
    </div>
  );
}

/**
 * Shared shell behind RegionSelect/RankSelect below.
 *
 * The popover portals to document.body instead of rendering inline: inline,
 * it was an absolutely-positioned child inside .ingame-modal's own
 * scrollable box, and an absolutely-positioned element still counts toward
 * its scroll-container's content size — an 11-row list popping open was
 * what made the whole modal grow a scrollbar. Portaling it out, positioned
 * from the trigger's own screen rect, also means it can never be clipped
 * by the modal or sit under it.
 *
 * `openId`/`onOpenChange` (rather than each dropdown owning its own `open`
 * state) is what makes opening one close the other — they share one slot.
 */
function DropdownShell({
  id,
  openId,
  onOpenChange,
  trigger,
  listId,
  children,
  popoverClassName,
  matchTriggerWidth = true,
}: {
  id: string;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  trigger: (open: boolean) => ReactNode;
  listId: string;
  children: ReactNode;
  popoverClassName?: string;
  /** Rank's own content (an icon + one short word) doesn't need to stretch
   * to the field's full width the way region names do — false lets the
   * popover size to its content instead of matching the trigger. */
  matchTriggerWidth?: boolean;
}) {
  const open = openId === id;
  const rootRef = useRef<HTMLDivElement>(null);
  // The popover portals out to document.body, so it's no longer a DOM
  // descendant of rootRef — the outside-click check below needs its own
  // ref for it, or every click inside the (now detached) list would count
  // as "outside" and close the dropdown on mousedown, before the option
  // button's click even gets to fire.
  const popoverRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number | undefined } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const box = rootRef.current?.getBoundingClientRect();
      if (box) setRect({ top: box.bottom + 6, left: box.left, width: matchTriggerWidth ? box.width : undefined });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, matchTriggerWidth]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) onOpenChange(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className={`payout-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="payout-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => onOpenChange(open ? null : id)}
      >
        {trigger(open)}
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={popoverRef}
            className={`payout-select__popover payout-select__popover--portal${popoverClassName ? ` ${popoverClassName}` : ""}`}
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
          >
            <ul id={listId} role="listbox">
              {children}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

// A native <select> can't be themed to match the dark popover the rest of
// this modal uses, and its open-state rendering is whatever the OS gives
// it. No search box here: the region list per game tops out around ten
// entries.
function RegionSelect({
  value,
  options,
  onChange,
  openId,
  onOpenChange,
}: {
  value: string;
  options: RegionOption[];
  onChange: (value: string) => void;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
}) {
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownShell
      id="region"
      openId={openId}
      onOpenChange={onOpenChange}
      listId={listId}
      trigger={() => <span>{selected ? `${selected.label} (${selected.value})` : "Select a region"}</span>}
    >
      {options.map((option) => (
        <li key={option.value}>
          <button
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              onOpenChange(null);
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
    </DropdownShell>
  );
}

// Same collapsed-until-needed idea as RegionSelect, now for rank — eleven
// icon tiles sitting open on screen at all times was the single biggest
// contributor to this modal feeling cluttered. Closed, it's one row that
// shows exactly what a plain <select> couldn't: the rank's own icon.
function RankSelect({
  value,
  options,
  onChange,
  openId,
  onOpenChange,
}: {
  value: string | null;
  options: { value: string; label: string; icon?: string }[];
  onChange: (value: string) => void;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
}) {
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownShell
      id="rank"
      openId={openId}
      onOpenChange={onOpenChange}
      listId={listId}
      popoverClassName="rank-select__popover"
      matchTriggerWidth={false}
      trigger={() => (
        <span className="rank-select__current">
          {selected?.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.icon} alt="" />
          )}
          <span className={selected ? "" : "is-placeholder"}>{selected?.label ?? "Select your rank"}</span>
        </span>
      )}
    >
      {options.map((option) => (
        <li key={option.value} style={{ "--rank-color": RANK_COLORS[option.value] ?? "var(--accent)" } as CSSProperties}>
          <button
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              onOpenChange(null);
            }}
          >
            <span className="rank-select__current">
              {option.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={option.icon} alt="" />
              )}
              <strong>{option.label}</strong>
            </span>
            {option.value === value && <i className="fa-solid fa-check" aria-hidden="true" />}
          </button>
        </li>
      ))}
    </DropdownShell>
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

/**
 * Where the Riot lookup for one particular `ign|region` got to. The key is
 * part of the state on purpose: it is what lets the render decide whether the
 * answer still describes what is in the box.
 */
type RiotFeedback =
  | { key: string; status: "checking" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "result"; result: RiotLookupResult };

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
  // The lookup's state carries the `ign|region` it belongs to, so a verdict
  // can never be shown under a name it wasn't about — the three separate flags
  // this replaced had to be cleared by hand on every path that changed the
  // input, and the debounce window in between showed the previous answer.
  const [riot, setRiot] = useState<RiotFeedback | null>(null);
  // Tracks the last `ign|region` a lookup actually ran for. A "found" result
  // rewrites `ign` to Riot's canonical Name#TAG casing below, which would
  // otherwise immediately re-trigger the debounce effect on its own output.
  const lastRiotKeyRef = useRef<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // What is currently worth looking up: a full Name#TAG on a game Riot can
  // answer for, or nothing at all.
  const riotKey = (() => {
    if (!RIOT_VERIFY_GAMES.has(gameSlug)) return null;
    const trimmed = ign.trim();
    const parts = trimmed.split("#");
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;
    return `${trimmed}|${region}`;
  })();
  // Only ever the answer to what is in the box right now.
  const riotFeedback = riot && riot.key === riotKey ? riot : null;
  const riotResult = riotFeedback?.status === "result" ? riotFeedback.result : null;

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

  // Auto-verifies as the user types, debounced — no manual button. Skips
  // re-running when `ign|region` matches the last key a lookup actually
  // completed for, which is what stops a "found" result's own canonical
  // rewrite of `ign` from immediately triggering another lookup.
  useEffect(() => {
    // Nothing to look up until the box holds a full Name#TAG. No state is
    // cleared here — `riotFeedback` below already ignores an answer whose key
    // doesn't match what is currently typed.
    if (!riotKey) return;
    const key = riotKey;
    const trimmed = ign.trim();
    if (key === lastRiotKeyRef.current) return;

    const timer = setTimeout(() => {
      setRiot({ key, status: "checking" });
      const timedOut = new Promise<never>((_, reject) => {
        // Generous, because the lookup chains several Riot calls and each
        // one retries — the server gives up well before this does.
        setTimeout(() => reject(new Error("timeout")), 30000);
      });
      Promise.race([verifyRiotAccount(trimmed, region), timedOut]).then((response) => {
        if (!response.ok) {
          lastRiotKeyRef.current = key;
          setRiot({ key, status: "error", message: response.error });
          return;
        }
        const { result } = response;
        // A found account rewrites the box to Riot's canonical casing, so the
        // answer has to be filed under that spelling — otherwise the render
        // below reads it as belonging to a different name and hides it.
        let resultKey = key;
        if (result.status === "found") {
          const canonicalIgn = `${result.gameName}#${result.tagLine}`;
          resultKey = `${canonicalIgn}|${region}`;
          setIgn(canonicalIgn);
          setRank(result.rank);
          setDivision(result.division);
        }
        lastRiotKeyRef.current = resultKey;
        setRiot({ key: resultKey, status: "result", result });
      }).catch((err: unknown) => {
        lastRiotKeyRef.current = key;
        // Deliberately distinct from the server's own failure text: the two
        // used to share one string, so there was no telling which side had
        // actually given up.
        const reason = err instanceof Error && err.message === "timeout" ? "timed out" : "couldn't be reached";
        console.error("[riot] client lookup failed", err);
        setRiot({ key, status: "error", message: `Lookup ${reason}. (client)` });
      });
    }, 650);

    return () => clearTimeout(timer);
  }, [riotKey, ign, region]);

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
    if (riotResult?.status === "wrong_server") {
      setError("This Riot ID is on a different server — pick the correct one above.");
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

  // A confirmed account settles the rank — including Unranked, which is a
  // real answer rather than a missing one — so asking for it again would
  // only invite a contradiction.
  const rankFromRiot = riotResult?.status === "found";

  // Solo/Duo is what the lookup asks Riot for, so say so rather than
  // leaving an unqualified rank that could be read as flex.
  const riotRankLabel =
    riotResult?.status === "found"
      ? riotResult.rank
        ? `${formatRank(gameSlug, riotResult.rank, riotResult.division)} · Solo/Duo`
        : "Unranked · Solo/Duo"
      : null;

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
              {!riotFeedback && <small className="form-row__note">{ignHint(gameSlug)}</small>}
            </div>

            <div className="form-row">
              <label>Server / region</label>
              <RegionSelect
                value={region}
                options={regions}
                onChange={setRegion}
                openId={openDropdown}
                onOpenChange={setOpenDropdown}
              />
            </div>
          </div>

          {/* Outside the two-column grid above: cramped into one column the
              name, level and badge all wrapped onto their own lines. */}
          {riotFeedback?.status === "checking" && (
            <p className="riot-line">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Looking up your account…
            </p>
          )}
          {riotFeedback?.status === "error" && (
            <p className="riot-line is-error">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {riotFeedback.message}
            </p>
          )}
          {riotResult && <RiotResultCard result={riotResult} region={region} rankLabel={riotRankLabel} />}

          {rankOptions.length > 0 && !rankFromRiot && (
            <div className="form-row form-row--section">
              <label>Current rank</label>
              <RankSelect
                value={rank}
                options={rankOptions}
                onChange={(value) => {
                  setRank(value);
                  if (!rankHasDivisions(value)) setDivision(null);
                }}
                openId={openDropdown}
                onOpenChange={setOpenDropdown}
              />
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
          <button
            type="button"
            className="btn btn--vivid"
            onClick={continueWithForm}
            disabled={pending || riotResult?.status === "wrong_server"}
          >
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
