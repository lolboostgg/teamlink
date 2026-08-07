"use server";

import { riotConfigured, verifyLeagueAccount, RiotApiError, type RiotVerifiedIdentity } from "@/lib/riotApi";

export type VerifyRiotResult =
  | { ok: true; identity: RiotVerifiedIdentity }
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
    const identity = await verifyLeagueAccount(ign, region);
    return { ok: true, identity };
  } catch (err) {
    const message = err instanceof RiotApiError ? err.message : "Couldn't verify that account right now.";
    return { ok: false, error: message };
  }
}
