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

async function riotFetch(url: string): Promise<unknown> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new RiotApiError("Riot API isn't configured yet.");

  const res = await fetch(url, { headers: { "X-Riot-Token": apiKey }, cache: "no-store" });
  if (res.status === 404) throw new RiotApiError("That Riot ID couldn't be found.");
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
}

interface RiotLeagueEntry {
  queueType: string;
  tier: string;
  rank: string; // "I" | "II" | "III" | "IV"
}

export interface RiotVerifiedIdentity {
  gameName: string;
  tagLine: string;
  rank: string | null;
  division: string | null;
}

/**
 * Resolves a Riot ID + region to their Ranked Solo/Duo rank. Returns
 * rank: null (not division: null too) for an unranked account — that's a
 * real, valid result, not a failure.
 */
export async function verifyLeagueAccount(ign: string, region: string): Promise<RiotVerifiedIdentity> {
  const [gameName, tagLine] = ign.split("#").map((part) => part.trim());
  if (!gameName || !tagLine) {
    throw new RiotApiError("Enter your Riot ID as Name#TAG.");
  }

  const continent = CONTINENT_BY_REGION[region];
  const platform = PLATFORM_BY_REGION[region];
  if (!continent || !platform) throw new RiotApiError("Unsupported region.");

  const account = (await riotFetch(
    `https://${continent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  )) as RiotAccount;

  const summoner = (await riotFetch(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
  )) as RiotSummoner;

  const entries = (await riotFetch(
    `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
  )) as RiotLeagueEntry[];

  const solo = entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
  const rankValue = solo ? (TIER_TO_RANK_VALUE[solo.tier] ?? null) : null;
  // Master and above have no division — same rule as rankHasDivisions()
  // in lib/gameRanks.ts.
  const hasDivision = rankValue && !["master", "grandmaster", "challenger"].includes(rankValue);

  return {
    gameName: account.gameName,
    tagLine: account.tagLine,
    rank: rankValue,
    division: hasDivision ? (solo!.rank ?? null) : null,
  };
}
