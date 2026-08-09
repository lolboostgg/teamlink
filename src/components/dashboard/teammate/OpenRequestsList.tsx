"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDispatchState } from "@/lib/dispatch/useDispatchState";
import type { DispatchOrderView } from "@/lib/dispatch/phase";
import { respondToDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { PriceTag } from "@/components/currency/PriceTag";
import { gameIcon } from "@/lib/gameArt";
import { formatRank, rankIcon } from "@/lib/gameRanks";
import { getGameProfileConfig, type ProfileOption } from "@/lib/gameProfiles";
import { playSound, stopSound } from "@/lib/notificationSound";
import { ackDispatchAlert } from "@/lib/dispatch/ack";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Every open request at once.
 *
 * The only place a request is answered. There was a modal that could open
 * over any page in the dashboard, showing one order at a time; it interrupted
 * work it had no business interrupting, hid the other invitations behind it,
 * and was a second source of the alert sound competing with this one. It is
 * gone. Requests live here.
 *
 * Reads /api/dispatch/state rather than the order history: history only lists
 * orders a teammate was actually picked for, so an invitation still waiting
 * for an answer never appeared in it — which is why this page was always
 * empty.
 *
 * It is built for a panel left open all day on a second monitor: everything
 * that matters is legible from across a desk, and a new request announces
 * itself with a sound, a tab title and a real OS notification rather than
 * waiting to be noticed.
 */
export function OpenRequestsList() {
  const { requests, waitingSince, serverNow, phase, refresh } = useDispatchState();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Once they have accepted, the alert has done its job. Silencing on the
  // phase rather than on the list emptying is what makes that immediate: the
  // row only drops out on the next read, and until then a second announcement
  // would land after they had already answered.
  const answered = phase !== "ONLINE_IDLE" && phase !== "DISPATCH_INCOMING";
  useRequestAlerts(requests, answered || busyId !== null);

  async function respond(orderId: string, accept: boolean) {
    setBusyId(orderId);
    const result = await respondToDispatchAction(orderId, accept);
    setBusyId(null);
    if (!result.ok) showToast(result.error, "error");
    else if (accept) showToast("Accepted — waiting for the customer to pick.", "success");
    refresh();
  }

  if (requests.length === 0) {
    return <IdlePanel waitingSince={waitingSince} serverNow={serverNow} offline={phase === "OFFLINE"} />;
  }

  return (
    <div className="request-list">
      <AlertPermission />
      {requests.map((request) => (
        <RequestCard
          key={request.order.id}
          request={request}
          busy={busyId === request.order.id}
          onRespond={respond}
        />
      ))}
    </div>
  );
}

function Fact({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`request-fact${strong ? " request-fact--strong" : ""}`}>
      <span className="request-fact__label">{label}</span>
      <span className="request-fact__value">{value}</span>
    </div>
  );
}

/** The lanes the customer asked for, as the game's own marks where it has any. */
function roleOptionsFor(gameSlug: string, values: string[]): ProfileOption[] {
  if (values.length === 0) return [];
  const options = getGameProfileConfig(gameSlug)?.roles?.options ?? [];
  return values.map((value) => options.find((option) => option.value === value) ?? { value, label: value });
}

/**
 * One open request, with its own clock.
 *
 * The countdown lives here rather than in the list because it decides more
 * than a number: once a wave lapses the alert is over, and a card that still
 * looks live invites a click that can only be refused. The server is the
 * authority — this just stops offering a button that has nothing behind it.
 */
function RequestCard({
  request,
  busy,
  onRespond,
}: {
  request: { order: DispatchOrderView; msLeft: number; acceptedCount: number };
  busy: boolean;
  onRespond: (orderId: string, accept: boolean) => void;
}) {
  const { order, msLeft, acceptedCount } = request;
  // Counts down locally between reads, and re-seeds whenever the server sends
  // a fresh figure — during render, so a card never shows a second of the
  // previous poll's clock after a new one has arrived.
  const [left, setLeft] = useState(msLeft);
  const [seededFrom, setSeededFrom] = useState(msLeft);
  if (seededFrom !== msLeft) {
    setSeededFrom(msLeft);
    setLeft(msLeft);
  }
  useEffect(() => {
    const t = setInterval(() => setLeft((value) => Math.max(0, value - 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const seconds = Math.ceil(left / 1000);
  // The row stays on screen for the moment between the clock running out and
  // the next read dropping it — vanishing mid-reach is its own confusion.
  const expired = left <= 0;
  const rank = formatRank(order.gameSlug, order.ignRank ?? null, order.ignDivision ?? null);
  const rankArt = rankIcon(order.gameSlug, order.ignRank ?? null);
  const roles = roleOptionsFor(order.gameSlug, order.ignRoles ?? []);

  // What the customer said they wanted, in the order it matters when you are
  // deciding whether to take them. Empty entries drop out rather than showing
  // a row of dashes — an unanswered preference is not information.
  const asks = [
    { icon: "fa-solid fa-face-smile", label: "Vibe", value: order.vibe },
    { icon: "fa-solid fa-microphone", label: "Comms", value: order.conversationPref },
    { icon: "fa-solid fa-chess", label: "Play style", value: order.playStylePref },
  ].filter((entry) => Boolean(entry.value));

  return (
    <article className={`request-card${expired ? " is-expired" : ""}`}>
      <header className="request-card__head">
        {/* The rank emblem where the game icon used to be. Which game it is
            already appears on the right; the rank is the thing that decides
            whether the order is worth taking, and an emblem lands faster than
            a word does. The game icon falls in behind it as a corner mark so
            neither answer is missing. */}
        <span className="request-card__badge">
          {rankArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rankArt} alt="" className="request-card__rank-art" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gameIcon(order.gameSlug)} alt="" className="request-card__icon" />
          )}
          {rankArt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gameIcon(order.gameSlug)} alt="" className="request-card__badge-game" />
          )}
        </span>
        <div className="request-card__who">
          <div className="request-card__rank">{rank ?? "Unranked"}</div>
          <div className="request-card__name">{order.customerLabel}</div>
          {order.ignRegion && <div className="request-card__region">{order.ignRegion.toUpperCase()}</div>}
        </div>
        <div className="request-card__order">
          <span className="request-card__order-no">#{order.orderNo}</span>
          <span className="request-card__order-game">{order.gameName}</span>
        </div>
        <div className={`request-card__timer${!expired && seconds <= 10 ? " is-urgent" : ""}`}>
          <span className="request-card__timer-value">{expired ? "—" : `${seconds}s`}</span>
          <span className="request-card__timer-label">{expired ? "expired" : "to answer"}</span>
        </div>
      </header>

      <div className="request-card__facts">
        <Fact label="Games" value={String(order.gamesBooked)} strong />
        <Fact label="Mode" value={order.option} />
        <Fact
          label="Team"
          value={order.teammatesRequested === 1 ? "Solo" : `${order.teammatesRequested} teammates`}
        />
        <Fact label="You earn" value={<PriceTag amountEUR={order.payoutEUR} />} strong />
      </div>

      {(roles.length > 0 || asks.length > 0) && (
        <div className="request-card__brief">
          {roles.length > 0 && (
            <span className="request-card__lanes" title={`Lanes: ${roles.map((r) => r.label).join(", ")}`}>
              {roles.map((role) =>
                role.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={role.value} src={role.icon} alt={role.label} />
                ) : (
                  <span key={role.value} className="request-card__lane-text">
                    {role.label}
                  </span>
                ),
              )}
            </span>
          )}
          {asks.map((ask) => (
            <span key={ask.label} className="request-card__ask">
              <i className={ask.icon} aria-hidden="true" />
              <span>
                <small>{ask.label}</small>
                <strong>{ask.value}</strong>
              </span>
            </span>
          ))}
        </div>
      )}

      <footer className="request-card__foot">
        <span className="request-card__accepted">
          {expired
            ? "Passed on to the next teammates."
            : acceptedCount === 0
              ? "First to accept"
              : `${acceptedCount} already accepted — the customer picks`}
        </span>
        <div className="request-card__actions">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy || expired}
            onClick={() => onRespond(order.id, false)}
          >
            Decline
          </button>
          <button
            type="button"
            className="btn btn--vivid request-card__accept"
            disabled={busy || expired}
            onClick={() => onRespond(order.id, true)}
          >
            {busy ? "Accepting…" : expired ? "Too late" : "Accept order"}
          </button>
        </div>
      </footer>
    </article>
  );
}

/**
 * What the panel shows for the vast majority of the day.
 *
 * A blank "nothing here" is indistinguishable from a page that has quietly
 * stopped working, and a teammate who suspects that reloads — which is what
 * we least want from a panel meant to stay open. A running clock is proof
 * the connection is alive.
 */
function IdlePanel({
  waitingSince,
  serverNow,
  offline,
}: {
  waitingSince: number | null;
  serverNow: number | null;
  offline: boolean;
}) {
  // Measured against the server's clock at the last read and advanced
  // locally, so a browser running behind doesn't invent waiting time. The
  // skew is taken inside the effect: comparing clocks during render made the
  // offset depend on when React happened to re-render, which is the one thing
  // it must not depend on.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const skew = serverNow ? serverNow - Date.now() : 0;
    const t = setInterval(() => setNow(Date.now() + skew), 1000);
    return () => clearInterval(t);
  }, [serverNow]);

  if (offline || !waitingSince) {
    return (
      <div className="request-idle request-idle--offline">
        <i className="fa-solid fa-power-off" aria-hidden="true" />
        <div className="request-idle__clock">Offline</div>
        <p className="request-idle__hint">
          Go online from the dashboard header — requests are only dispatched to teammates who are listed and
          available.
        </p>
      </div>
    );
  }

  const minutes = Math.max(0, Math.floor((now - waitingSince) / 60_000));
  const since = new Date(waitingSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="request-idle">
      <span className="request-idle__pulse" aria-hidden="true" />
      <div className="request-idle__label">Time elapsed</div>
      <div className="request-idle__clock">
        {minutes} min <span className="request-idle__since">(waiting since {since})</span>
      </div>
      <p className="request-idle__hint">
        Waiting for orders. Keep this panel open — the next request appears here on its own, with a sound and a
        desktop notification.
      </p>
      <AlertPermission />
    </div>
  );
}

/**
 * Desktop notifications only work if they have been granted, and browsers
 * only allow the request from a click. Shown until answered, then gone for
 * good — a permanently visible permission nag is its own kind of noise.
 */
function AlertPermission() {
  const [state, setState] = useState<NotificationPermission | "unsupported">("granted");

  useEffect(() => {
    // Deliberate: the permission only exists in the browser, so it cannot be
    // read during the server render or as an initial value without a
    // hydration mismatch. Same one-time correction as PromoBanner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  if (state !== "default") return null;

  return (
    <button
      type="button"
      className="request-permission"
      onClick={() => void Notification.requestPermission().then(setState)}
    >
      <i className="fa-solid fa-bell" aria-hidden="true" />
      Turn on desktop notifications
    </button>
  );
}

/**
 * Announces a request that wasn't there a moment ago.
 *
 * Three channels on purpose, because the panel is meant to be left open in a
 * background tab: the sound carries in the room, the tab title carries in a
 * crowded browser, and the OS notification carries when the browser itself is
 * behind something else.
 */
function useRequestAlerts(
  requests: { order: { id: string; orderNo: number; gameName: string } }[],
  silenced: boolean,
) {
  const seen = useRef<Set<string> | null>(null);
  const baseTitle = useRef<string>("");

  useEffect(() => {
    baseTitle.current = document.title;
    return () => {
      document.title = baseTitle.current;
    };
  }, []);

  useEffect(() => {
    // The first read is the state of the world, not news — without this,
    // opening the page with two requests already open fires two alerts.
    if (seen.current === null) {
      seen.current = new Set(requests.map((r) => r.order.id));
      return;
    }

    for (const { order } of requests) {
      if (seen.current.has(order.id)) continue;
      if (silenced) {
        // Still recorded as seen, so it doesn't announce itself later as if
        // it had just arrived.
        seen.current.add(order.id);
        continue;
      }
      seen.current.add(order.id);
      // Before the sound: this is the moment the alert is provably on screen,
      // and only from here may a non-response count against them.
      ackDispatchAlert(order.id);
      playSound("request");
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        // The tag collapses repeats of the same order rather than stacking a
        // notification per poll.
        new Notification("New order request", {
          body: `#${order.orderNo} · ${order.gameName} — open your dashboard to accept.`,
          tag: `request-${order.id}`,
        });
      }
    }

    // Cleared only when the list is genuinely empty, so an order that comes
    // back around later still counts as new.
    //
    // It used to be rebuilt from the current list on every read, which meant
    // any request missing from a single response — a slow query, a wave
    // boundary, an order that flickered out and back — was announced all over
    // again on the next one. That is where the stutter came from.
    if (requests.length === 0) seen.current = new Set();

    document.title = requests.length > 0 ? `(${requests.length}) ${baseTitle.current}` : baseTitle.current;
  }, [requests, silenced]);

  // The alert is a recording, not a beep. Accepting two seconds in used to
  // leave the rest of it playing under the "waiting for the customer" dialog,
  // still announcing what had just been answered.
  useEffect(() => {
    if (silenced || requests.length === 0) stopSound("request");
    // And on the way out. Accepting navigates to the order room, which
    // unmounted this while the clip was still running — so the alert for an
    // order they had just taken followed them into it and kept playing.
    return () => stopSound("request");
  }, [silenced, requests.length]);
}
