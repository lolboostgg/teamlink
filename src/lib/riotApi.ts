/**
 * Riot Games API — trial integration so a customer can verify their Riot ID
 * and have their League of Legends rank pulled in automatically instead of
 * (or as a check against) picking it by hand. Server-only: RIOT_API_KEY
 * must never reach the client, so every call here runs from a server
 * action (see app/actions/riot.ts).
 *
 * Two routing systems, because Riot splits its API that way:
 * - Continental routing (europe/americas/asia/sea) for Account-V1, which
 *   resolves a Riot ID (Name#TAG) to a PUUID — account-level, not tied to
 *   one game server.
 * - Platform routing (euw1/na1/...) for Summoner-V4 and League-V4, which
 *   are LoL-specific and scoped to the server the summoner plays on.
 */

const PLATFORM_BY_REGION: Record<string, string> = {
  EUW: "euw1",
  EUNE: "eun1",
  NA: "na1",
  OCE: "oc1",
  BR: "br1",
  LAN: "la1",
  LAS: "la2",
  TR: "tr1",
  RU: "ru",
  JP: "jp1",
  KR: "kr",
};

const REGION_BY_PLATFORM: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_BY_REGION).map(([region, platform]) => [platform, region]),
);

const CONTINENT_BY_REGION: Record<string, string> = {
  EUW: "europe",
  EUNE: "europe",
  TR: "europe",
  RU: "europe",
  NA: "americas",
  BR: "americas",
  LAN: "americas",
  LAS: "americas",
  OCE: "sea",
  JP: "asia",
  KR: "asia",
};

// Every platform reachable under a continent's routing value — used to
// find which server a Riot ID actually plays on when it isn't the one the
// order was booked for (see "wrong server" in verifyLeagueAccount below).
const PLATFORMS_BY_CONTINENT: Record<string, string[]> = {
  europe: ["euw1", "eun1", "tr1", "ru"],
  americas: ["na1", "br1", "la1", "la2"],
  asia: ["kr", "jp1"],
  sea: ["oc1"],
};

// Riot's tier names are upper-case ("GOLD", "GRANDMASTER") — our own rank
// values (see lib/gameRanks.ts / gameProfiles.ts) are lower-case to match
// the icon filenames they're keyed by.
const TIER_TO_RANK_VALUE: Record<string, string> = {
  IRON: "iron",
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
  EMERALD: "emerald",
  DIAMOND: "diamond",
  MASTER: "master",
  GRANDMASTER: "grandmaster",
  CHALLENGER: "challenger",
};

export function riotConfigured(): boolean {
  return Boolean(process.env.RIOT_API_KEY);
}

export class RiotApiError extends Error {}

/**
 * Pasted keys pick up stray quotes and trailing newlines distressingly
 * often, and an invalid header *value* makes fetch throw a TypeError
 * rather than return a status — which reads as a generic failure with
 * nothing pointing at the actual cause. Strip that before it gets there.
 */
function apiKey(): string {
  const raw = process.env.RIOT_API_KEY;
  if (!raw) throw new RiotApiError("Riot API isn't configured yet.");
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

const ATTEMPT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * null on a 404 specifically — every other non-2xx throws.
 *
 * Retries rate limits and Riot's own 5xx/network blips rather than failing
 * the lookup outright: both are routine against this API. Waits stay short
 * and bounded on purpose — a customer is sitting in front of the form, so
 * giving up quickly beats honouring a 30s Retry-After.
 */
async function riotFetch(url: string): Promise<unknown | null> {
  const token = apiKey();
  let lastStatus = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "X-Riot-Token": token },
        cache: "no-store",
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
    } catch (err) {
      // Timeout or transport failure — worth one more try before giving up.
      if (attempt < MAX_RETRIES) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      console.error("[riot] request failed", safeUrl(url), err);
      throw new RiotApiError("Couldn't reach the Riot API.");
    }

    if (res.status === 404) return null;
    if (res.status === 401) throw new RiotApiError("Riot API key is missing or malformed.");
    if (res.status === 403) throw new RiotApiError("Riot API key is invalid or expired.");

    if (res.status === 429 || res.status >= 500) {
      lastStatus = res.status;
      if (attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        await sleep(Math.min(2000, Math.max(500, retryAfter * 1000 || 500 * (attempt + 1))));
        continue;
      }
      throw new RiotApiError(
        res.status === 429
          ? "Too many lookups right now — try again in a moment."
          : "Riot API is temporarily unavailable. Try again shortly.",
      );
    }

    if (!res.ok) throw new RiotApiError(`Riot API error (${res.status}).`);

    try {
      return await res.json();
    } catch {
      throw new RiotApiError("Riot API returned an invalid response.");
    }
  }

  throw new RiotApiError(`Riot API unavailable after retries (${lastStatus}).`);
}

/** Drops the trailing path segment so a Riot ID/PUUID never lands in a log. */
function safeUrl(url: string): string {
  return url.replace(/\/[^/]*$/, "/…");
}

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface RiotSummoner {
  profileIconId: number;
  summonerLevel: number;
}

interface RiotLeagueEntry {
  queueType: string;
  tier: string;
  rank: string; // "I" | "II" | "III" | "IV"
}

export interface RiotLookupFound {
  status: "found";
  gameName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
  regionLabel: string;
  rank: string | null;
  division: string | null;
}

export interface RiotLookupNotFound {
  status: "not_found";
}

export interface RiotLookupWrongServer {
  status: "wrong_server";
  actualRegionLabel: string;
}

export type RiotLookupResult = RiotLookupFound | RiotLookupNotFound | RiotLookupWrongServer;

/**
 * Keyed on PUUID, not the encrypted summoner id: Riot has been retiring
 * `id` from Summoner-V4 responses, and a missing one silently turned every
 * lookup into "Unranked" via a 404 on the by-summoner route.
 */
async function fetchRankEntry(platform: string, puuid: string): Promise<RiotLeagueEntry | undefined> {
  const entries = (await riotFetch(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`)) as
    | RiotLeagueEntry[]
    | null;
  return entries?.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
}

function toRankFields(entry: RiotLeagueEntry | undefined): { rank: string | null; division: string | null } {
  const rankValue = entry ? (TIER_TO_RANK_VALUE[entry.tier] ?? null) : null;
  // Master and above have no division — same rule as rankHasDivisions()
  // in lib/gameRanks.ts.
  const hasDivision = rankValue && !["master", "grandmaster", "challenger"].includes(rankValue);
  return { rank: rankValue, division: hasDivision ? (entry!.rank ?? null) : null };
}

/**
 * Resolves a Riot ID + the region the order was booked for. Three outcomes,
 * not just success/failure:
 * - found: plays on that exact region — rank comes along with it.
 * - wrong_server: the Riot ID is real, just not on the booked region (a
 *   teammate on the wrong server literally cannot add them) — points at
 *   which region it actually is.
 * - not_found: no such Riot ID at all (or a typo).
 */
export async function verifyLeagueAccount(ign: string, region: string): Promise<RiotLookupResult> {
  const [gameName, tagLine] = ign.split("#").map((part) => part.trim());
  if (!gameName || !tagLine) {
    throw new RiotApiError("Please enter the full Riot ID with #tag, e.g. Faker#1234.");
  }

  const continent = CONTINENT_BY_REGION[region];
  const platform = PLATFORM_BY_REGION[region];
  if (!continent || !platform) throw new RiotApiError("Unsupported region.");

  const account = (await riotFetch(
    `https://${continent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  )) as RiotAccount | null;
  if (!account) return { status: "not_found" };

  const summoner = (await riotFetch(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
  )) as RiotSummoner | null;

  if (summoner) {
    // The account is already confirmed at this point — a rate-limited or
    // failing rank call should cost the rank, not the whole result.
    let entry: RiotLeagueEntry | undefined;
    try {
      entry = await fetchRankEntry(platform, account.puuid);
    } catch (err) {
      console.error("[riot] rank lookup failed", err);
    }
    const { rank, division } = toRankFields(entry);
    return {
      status: "found",
      gameName: account.gameName,
      tagLine: account.tagLine,
      profileIconId: summoner.profileIconId,
      summonerLevel: summoner.summonerLevel,
      regionLabel: region,
      rank,
      division,
    };
  }

  // Not on the booked platform — check the account's real one before
  // giving up, so a customer who just picked the wrong region in the
  // dropdown gets told exactly what's wrong instead of "not found".
  // Fired together rather than in a loop: sequentially this is four more
  // round-trips stacked on the two already made, which is enough to run
  // past the caller's patience on a slow link.
  const otherPlatforms = (PLATFORMS_BY_CONTINENT[continent] ?? []).filter((p) => p !== platform);
  const probes = await Promise.all(
    otherPlatforms.map(async (otherPlatform) => {
      try {
        const found = await riotFetch(
          `https://${otherPlatform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
        );
        return found ? otherPlatform : null;
      } catch {
        // One unreachable shard must not sink the whole lookup.
        return null;
      }
    }),
  );

  const hit = probes.find(Boolean);
  if (hit) {
    return { status: "wrong_server", actualRegionLabel: REGION_BY_PLATFORM[hit] ?? hit };
  }

  return { status: "not_found" };
}
