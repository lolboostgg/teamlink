import { NextResponse } from "next/server";
import { getFxSnapshot } from "@/lib/fx";

export const runtime = "nodejs";

/**
 * Reference rates for the currency switcher. Public — it is the same data the
 * ECB publishes openly, and the client needs it to convert display prices.
 */
export async function GET() {
  const snapshot = await getFxSnapshot();
  return NextResponse.json(snapshot, {
    // Rates change once a working day; a few minutes of edge caching costs
    // nothing and keeps a page full of PriceTags off the origin.
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
}
