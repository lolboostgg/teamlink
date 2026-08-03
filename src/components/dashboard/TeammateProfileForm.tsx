"use client";

import { useMemo, useState, useTransition } from "react";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { GAMES } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";
import {
  getGameProfileConfig,
  EMPTY_GAME_PROFILE,
  type GameProfileEntry,
  type GameProfileMap,
  type GameProfileSection,
  type ProfileOption,
} from "@/lib/gameProfiles";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { IconSelect } from "@/components/ui/IconSelect";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import type { TeammateProfileInput } from "@/lib/teammateProfile";

export interface TeammateProfileFormValue
  extends Omit<TeammateProfileInput, "lolRank" | "lolChampions" | "lolLanes"> {
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

// Above this many options a flat pill wall stops being scannable, so the
// section gets a search box and a scroll container (League's ~170 champions).
const SEARCHABLE_FROM = 24;

function OptionPill({
  option,
  checked,
  onToggle,
  avatar,
}: {
  option: ProfileOption;
  checked: boolean;
  onToggle: () => void;
  avatar?: boolean;
}) {
  return (
    <label className={`chip-check${avatar ? " chip-check--avatar" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {option.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={option.icon} alt="" className="chip-check__icon" loading="lazy" />
      ) : option.glyph ? (
        <i className={`${option.glyph} chip-check__glyph`} aria-hidden="true" />
      ) : null}
      <span>{option.label}</span>
    </label>
  );
}

function PillSection({
  section,
  selected,
  onChange,
}: {
  section: GameProfileSection;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const searchable = section.options.length > SEARCHABLE_FROM;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? section.options.filter((o) => o.label.toLowerCase().includes(q)) : section.options;
    if (!searchable) return matches;
    // Selected entries float to the top so a picked champion stays visible
    // without scrolling back through the roster.
    const chosen = new Set(selected);
    return [...matches].sort((a, b) => Number(chosen.has(b.value)) - Number(chosen.has(a.value)));
  }, [query, searchable, section.options, selected]);

  return (
    <div className="form-row">
      <label>
        {section.label}
        {searchable && <span className="form-row__count">{selected.length} selected</span>}
      </label>
      {searchable && (
        <div className="pill-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder={`Search ${section.label.toLowerCase()}…`}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      <div className={`chip-check-group${searchable ? " chip-check-group--scroll" : ""}`}>
        {visible.map((o) => (
          <OptionPill
            key={o.value}
            option={o}
            avatar={Boolean(o.icon)}
            checked={selected.includes(o.value)}
            onToggle={() => onChange(toggle(selected, o.value))}
          />
        ))}
        {visible.length === 0 && <p className="chip-check-group__empty">No match for “{query}”.</p>}
      </div>
    </div>
  );
}

export function TeammateProfileForm({ initial, showAdminFields, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [languages, setLanguages] = useState<LanguageCode[]>(initial.languages);
  const [gameSlugs, setGameSlugs] = useState<string[]>(initial.gameSlugs);
  const [gameProfiles, setGameProfiles] = useState<GameProfileMap>(initial.gameProfiles);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // One editable block per game the teammate is actually listed for — each
  // game brings its own ranks/roles/pool from the registry.
  const sections = gameSlugs
    .map((slug) => ({ game: GAMES.find((g) => g.slug === slug), config: getGameProfileConfig(slug) }))
    .filter((s): s is { game: (typeof GAMES)[number]; config: NonNullable<ReturnType<typeof getGameProfileConfig>> } =>
      Boolean(s.game && s.config),
    );

  function patch(slug: string, change: Partial<GameProfileEntry>) {
    setGameProfiles((prev) => ({
      ...prev,
      [slug]: { ...EMPTY_GAME_PROFILE, ...prev[slug], ...change },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await onSave({ name, tagline, timezone, avatarUrl, languages, gameSlugs, gameProfiles });
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

      <div className="form-row">
        <label htmlFor="tp-timezone">Timezone</label>
        <input id="tp-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="CET (UTC+1)" />
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
              <span>{l.label}</span>
            </label>
          ))}
        </div>
      </div>

      {showAdminFields && (
        <div className="form-row">
          <label>Games this teammate is listed for</label>
          <div className="chip-check-group">
            {GAMES.map((g) => (
              <label key={g.slug} className="chip-check chip-check--avatar">
                <input
                  type="checkbox"
                  checked={gameSlugs.includes(g.slug)}
                  onChange={() => setGameSlugs((prev) => toggle(prev, g.slug))}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gameIcon(g.slug)} alt="" className="chip-check__icon" />
                <span>{g.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {sections.length === 0 && (
        <p className="form-row__hint">
          No games assigned yet — an admin decides which games you&rsquo;re listed for.
        </p>
      )}

      {sections.map(({ game, config }) => {
        const entry = gameProfiles[game.slug] ?? EMPTY_GAME_PROFILE;
        return (
          <fieldset key={game.slug} className="game-profile-block">
            <legend className="game-profile-block__legend">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gameIcon(game.slug)} alt="" />
              {game.name}
            </legend>

            {config.ranks && (
              <div className="form-row">
                <label>{config.ranks.label}</label>
                <IconSelect
                  label={`${game.name} ${config.ranks.label}`}
                  value={entry.rank}
                  options={config.ranks.options}
                  onChange={(rank) => patch(game.slug, { rank })}
                />
              </div>
            )}

            {config.roles && (
              <PillSection
                section={config.roles}
                selected={entry.roles}
                onChange={(roles) => patch(game.slug, { roles })}
              />
            )}

            {config.pool && (
              <PillSection
                section={config.pool}
                selected={entry.pool}
                onChange={(pool) => patch(game.slug, { pool })}
              />
            )}
          </fieldset>
        );
      })}

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
