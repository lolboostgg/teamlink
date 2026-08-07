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

/** null on a 404 specifically — every other non-2xx throws. */
async function riotFetch(url: string): Promise<unknown | null> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new RiotApiError("Riot API isn't configured yet.");

  const res = await fetch(url, { headers: { "X-Riot-Token": apiKey }, cache: "no-store" });
  if (res.status === 404) return null;
  if (res.status === 403) throw new RiotApiError("Riot API key is invalid or expired.");
  if (res.status === 429) throw new RiotApiError("Too many lookups right now — try again in a moment.");
  if (!res.ok) throw new RiotApiError(`Riot API error (${res.status}).`);
  return res.json();
}

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface RiotSummoner {
  id: string; // encrypted summoner id — what League-V4 keys entries on
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

async function fetchRankEntry(platform: string, summonerId: string): Promise<RiotLeagueEntry | undefined> {
  const entries = (await riotFetch(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`)) as
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
    const entry = await fetchRankEntry(platform, summoner.id);
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
  const otherPlatforms = (PLATFORMS_BY_CONTINENT[continent] ?? []).filter((p) => p !== platform);
  for (const otherPlatform of otherPlatforms) {
    const otherSummoner = (await riotFetch(
      `https://${otherPlatform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
    )) as RiotSummoner | null;
    if (otherSummoner) {
      return { status: "wrong_server", actualRegionLabel: REGION_BY_PLATFORM[otherPlatform] ?? otherPlatform };
    }
  }

  return { status: "not_found" };
}
