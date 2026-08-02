"use client";

import { useState, useTransition } from "react";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { GAMES } from "@/lib/games";
import { RANK_TIERS, CHAMPION_NAMES, LOL_LANES, championIcon, getRankMeta, type LolRankTier, type ChampionName, type LolLane } from "@/lib/lolAssets";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import type { TeammateProfileInput } from "@/lib/teammateProfile";

export interface TeammateProfileFormValue extends TeammateProfileInput {
  name: string;
  gameSlugs: string[];
}

interface Props {
  initial: TeammateProfileFormValue;
  // Admin editing someone else's row can rename them and assign which
  // games they're listed for; a teammate editing their own profile can't
  // (name changes and game assignment both stay admin-only, per the
  // request — "der admin kann dann die games festlegen für die teammates").
  showAdminFields: boolean;
  onSave: (value: TeammateProfileFormValue) => Promise<void>;
  onCancel?: () => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function TeammateProfileForm({ initial, showAdminFields, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [languages, setLanguages] = useState<LanguageCode[]>(initial.languages);
  const [gameSlugs, setGameSlugs] = useState<string[]>(initial.gameSlugs);
  const [lolRank, setLolRank] = useState<LolRankTier | null>(initial.lolRank);
  const [lolChampions, setLolChampions] = useState<ChampionName[]>(initial.lolChampions);
  const [lolLanes, setLolLanes] = useState<LolLane[]>(initial.lolLanes);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await onSave({ name, tagline, timezone, avatarUrl, languages, gameSlugs, lolRank, lolChampions, lolLanes });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save — try again.");
      }
    });
  }

  return (
    <form className="teammate-profile-form" onSubmit={handleSubmit}>
      {showAdminFields && (
        <div className="form-row">
          <label htmlFor="tp-name">Display name</label>
          <input id="tp-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      )}

      <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} />

      <div className="form-row-grid">
        <div className="form-row">
          <label htmlFor="tp-timezone">Timezone</label>
          <input id="tp-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="CET (UTC+1)" />
        </div>
        <div className="form-row">
          <label htmlFor="tp-rank">League of Legends rank</label>
          <div className="rank-select">
            {lolRank && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getRankMeta(lolRank).icon} alt="" className="rank-select__icon" />
            )}
            <select id="tp-rank" value={lolRank ?? ""} onChange={(e) => setLolRank((e.target.value || null) as LolRankTier | null)}>
              <option value="">Not set</option>
              {RANK_TIERS.map((r) => (
                <option key={r.tier} value={r.tier}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="tp-tagline">Tagline</label>
        <textarea id="tp-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={240} />
      </div>

      <div className="form-row">
        <label>Languages</label>
        <div className="chip-check-group">
          {LANGUAGES.map((l) => (
            <label key={l.code} className="chip-check">
              <input
                type="checkbox"
                checked={languages.includes(l.code)}
                onChange={() => setLanguages((prev) => toggle(prev, l.code))}
              />
              <FlagIcon iso={l.flagIso} />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>League of Legends champion pool</label>
        <div className="chip-check-group">
          {CHAMPION_NAMES.map((c) => (
            <label key={c} className="chip-check">
              <input
                type="checkbox"
                checked={lolChampions.includes(c)}
                onChange={() => setLolChampions((prev) => toggle(prev, c))}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={championIcon(c)} alt="" className="chip-check__icon" />
              {c}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>League of Legends lanes</label>
        <div className="chip-check-group">
          {LOL_LANES.map((lane) => (
            <label key={lane} className="chip-check">
              <input
                type="checkbox"
                checked={lolLanes.includes(lane)}
                onChange={() => setLolLanes((prev) => toggle(prev, lane))}
              />
              {lane}
            </label>
          ))}
        </div>
      </div>

      {showAdminFields && (
        <div className="form-row">
          <label>Games this teammate is listed for</label>
          <div className="chip-check-group">
            {GAMES.map((g) => (
              <label key={g.slug} className="chip-check">
                <input
                  type="checkbox"
                  checked={gameSlugs.includes(g.slug)}
                  onChange={() => setGameSlugs((prev) => toggle(prev, g.slug))}
                />
                {g.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="form-row__error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="teammate-profile-form__actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--vivid" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
