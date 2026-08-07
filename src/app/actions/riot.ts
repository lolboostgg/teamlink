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
    // Anything landing here is a bug rather than a Riot-side answer. The
    // detail rides back to the form because this host's runtime logs
    // aren't readable in practice, and a generic string left the actual
    // cause invisible through several rounds of debugging.
    console.error("[riot] lookup failed", { region, err });
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { ok: false, error: `Lookup failed — ${detail}` };
  }
}
