"use server";

import { riotConfigured, verifyLeagueAccount, RiotApiError, type RiotLookupResult } from "@/lib/riotApi";

export type VerifyRiotResult =
  | { ok: true; result: RiotLookupResult }
  | { ok: false; error: string };

/**
 * Looks a Riot ID up against the real Riot API and returns their current
 * Ranked Solo/Duo rank — trial integration, League of Legends only for now
 * (see lib/riotApi.ts). Never throws: the in-game info form falls back to
 * picking the rank by hand on any failure, so this is a convenience, not a
 * hard dependency.
 */
export async function verifyRiotAccount(ign: string, region: string): Promise<VerifyRiotResult> {
  if (!riotConfigured()) {
    return { ok: false, error: "Riot verification isn't set up yet — pick your rank manually below." };
  }
  try {
    const result = await verifyLeagueAccount(ign, region);
    return { ok: true, result };
  } catch (err) {
    if (err instanceof RiotApiError) {
      return { ok: false, error: err.message };
    }
    // Anything landing here is a bug rather than a Riot-side answer, and
    // the generic message alone left nothing to debug from.
    console.error("[riot] lookup failed", { region, err });
    return { ok: false, error: "Couldn't verify that account right now." };
  }
}
