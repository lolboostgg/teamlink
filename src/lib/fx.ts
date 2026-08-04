import { CURRENCIES, type CurrencyCode, type RateTable } from "@/lib/currency";

/**
 * Live EUR reference rates from the European Central Bank.
 *
 * Same source as the cron on the PHP site: the ECB publishes one XML with
 * every rate quoted per 1 EUR, updated on working days around 16:00 CET.
 * It's free, needs no key, and is the rate a European business is expected
 * to be able to point at.
 *
 * Display only. Everything is stored and charged in EUR — a converted figure
 * is an estimate for the customer's benefit, never the amount that moves.
 */

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const REFRESH_MS = 6 * 60 * 60 * 1000;

// Rates outside this band mean the feed changed shape or returned something
// nonsensical — the PHP cron guards USD the same way. Better to keep serving
// the static fallback than to quote a price off by a factor of ten.
const PLAUSIBLE: Partial<Record<CurrencyCode, [number, number]>> = {
  USD: [0.9, 1.4],
  GBP: [0.6, 1.1],
  CHF: [0.7, 1.3],
  JPY: [90, 250],
};

export interface FxSnapshot {
  rates: RateTable;
  /** The ECB's own publication date, not when we fetched it. */
  date: string | null;
  source: "ECB" | "fallback";
  fetchedAt: number;
}

const WANTED = new Set(CURRENCIES.map((entry) => entry.code));

const globalForFx = globalThis as unknown as { teamlinkFx?: FxSnapshot; teamlinkFxInflight?: Promise<FxSnapshot> };

function fallback(): FxSnapshot {
  return {
    rates: Object.fromEntries(CURRENCIES.map((entry) => [entry.code, entry.rate])) as RateTable,
    date: null,
    source: "fallback",
    fetchedAt: Date.now(),
  };
}

/**
 * The ECB document is a flat list of `<Cube currency="USD" rate="1.0842"/>`.
 * Matching those two attributes directly avoids pulling in an XML parser for
 * a format that has been stable for two decades.
 */
function parse(xml: string): { rates: RateTable; date: string | null } {
  const rates: RateTable = { EUR: 1 };
  const cube = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = cube.exec(xml)) !== null) {
    const code = match[1] as CurrencyCode;
    if (!WANTED.has(code)) continue;
    const rate = Number(match[2]);
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const bounds = PLAUSIBLE[code];
    if (bounds && (rate < bounds[0] || rate > bounds[1])) continue;
    rates[code] = rate;
  }
  const date = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1] ?? null;
  return { rates, date };
}

export async function getFxSnapshot(): Promise<FxSnapshot> {
  const cached = globalForFx.teamlinkFx;
  if (cached && Date.now() - cached.fetchedAt < REFRESH_MS) return cached;
  // Collapses a burst of concurrent requests into one upstream fetch.
  if (globalForFx.teamlinkFxInflight) return globalForFx.teamlinkFxInflight;

  globalForFx.teamlinkFxInflight = (async () => {
    try {
      const response = await fetch(ECB_URL, {
        next: { revalidate: 21_600 },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`ECB responded ${response.status}`);
      const { rates, date } = parse(await response.text());

      // A handful of codes means we parsed noise; keep the last good answer.
      if (Object.keys(rates).length < 5) throw new Error("ECB payload had too few rates");

      const snapshot: FxSnapshot = { rates: { ...fallback().rates, ...rates }, date, source: "ECB", fetchedAt: Date.now() };
      globalForFx.teamlinkFx = snapshot;
      return snapshot;
    } catch {
      // Serve the previous snapshot if we have one, otherwise the static
      // table. A currency switcher must never be the reason a page fails.
      const previous = globalForFx.teamlinkFx;
      if (previous) return { ...previous, fetchedAt: Date.now() };
      return fallback();
    } finally {
      globalForFx.teamlinkFxInflight = undefined;
    }
  })();

  return globalForFx.teamlinkFxInflight;
}
