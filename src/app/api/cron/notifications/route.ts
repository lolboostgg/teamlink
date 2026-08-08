import { NextResponse } from "next/server";
import { sweepUnreadMessages } from "@/lib/notify/unreadMessages";

export const dynamic = "force-dynamic";

/**
 * The one job that cannot run on a read.
 *
 * Everything else in this codebase catches up when somebody looks at it —
 * reconcileOrder() advances the clock-driven order transitions on every read,
 * which works because there is always someone watching an order that is
 * moving. Chasing an unanswered message is the exception: "nobody has looked
 * at this in five minutes" is the condition, so waiting for a read would mean
 * waiting forever.
 *
 * Meant for a one-minute cron on the hosting panel:
 *
 *   curl -fsS -H "X-Cron-Secret: $CRON_SECRET" https://gaming.lolboost.gg/api/cron/notifications
 *
 * Cheap to over-call — the sweep is idempotent, so a duplicate run finds
 * everything already chased and writes nothing.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // No secret configured means the endpoint stays shut rather than open: an
  // unauthenticated job that writes notifications is a spam vector.
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }

  // Header or query string — some panels can only fetch a plain URL.
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  try {
    const unread = await sweepUnreadMessages();
    return NextResponse.json({ ok: true, unread }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[cron] sweep failed:", err);
    return NextResponse.json({ error: "Sweep failed." }, { status: 500 });
  }
}
