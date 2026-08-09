import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/notify/mail";
import {
  orderConfirmationMail,
  orderCompletedMail,
  orderCancelledMail,
} from "@/lib/notify/templates";
import { postToTeammateChannel, ACCENT } from "@/lib/notify/discordNotify";
import { formatRank } from "@/lib/gameRanks";
import { sanitizeNotificationPrefs, type NotificationChannel } from "@/lib/notificationPrefs";

/**
 * What gets sent out when an order moves.
 *
 * Called from the dispatch path, never awaited by anything the customer is
 * waiting on — see the callers in lib/dispatch/create.ts. Nothing in here may
 * throw: an unreachable mailbox or a Discord outage must not roll back a paid
 * order.
 */

/** No request context here (this runs after a webhook or a server action), so
 * the public origin comes from configuration rather than the incoming URL. */
export function appUrl(): string {
  return (process.env.APP_URL ?? "https://gaming.lolboost.gg").replace(/\/$/, "");
}

/**
 * The link to an order that is safe to send somewhere.
 *
 * Prefers the order's access token over its id. The id is what every internal
 * API route is keyed by, so a link carrying it hands whoever it reaches the
 * key to those routes — and this is the link that ends up in a mailbox, a
 * Discord message and a support thread. The token opens one page and nothing
 * else.
 *
 * Falls back to the old query URL for orders written before the column
 * existed, which still resolve by id.
 */
export function orderUrl(order: { id: string; accessToken?: string | null }): string {
  if (order.accessToken) return `${appUrl()}/order/${encodeURIComponent(order.accessToken)}`;
  return `${appUrl()}/checkout/matching?order=${encodeURIComponent(order.id)}`;
}

/** Whether a user wants order updates on this channel. Unset means yes — an
 * account that never touched the settings still gets told about its order. */
function wantsOrderUpdates(prefsJson: unknown, channel: NotificationChannel): boolean {
  return sanitizeNotificationPrefs(prefsJson).orders?.[channel] ?? true;
}

/**
 * The order is paid and has gone out to teammates. Tells the customer where to
 * watch it, and the roster that there is something to take.
 */
export async function notifyOrderDispatched(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        clientUser: { select: { email: true, name: true, notificationPrefs: true } },
      },
    });
    if (!order) return;

    await Promise.allSettled([mailCustomer(order), pingTeammates(order)]);
  } catch (err) {
    console.error("[notify] dispatch notifications failed:", orderId, err);
  }
}

/** Just the fields the two helpers below read, so they don't have to name the
 * full Prisma payload type. */
interface DispatchedOrder {
  id: string;
  orderNo: number;
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: unknown;
  teammatePayoutEUR: unknown;
  teammatesRequested: number;
  gamesBooked: number;
  guestEmail: string | null;
  ign: string | null;
  ignRegion: string | null;
  ignRank: string | null;
  ignDivision: string | null;
  vibe: string | null;
  conversationPref: string | null;
  playStylePref: string | null;
  clientUser: { email: string; name: string | null; notificationPrefs: unknown } | null;
}

async function mailCustomer(order: DispatchedOrder): Promise<void> {
  // Exactly one of the two carries the address: a guest order has no account
  // to read an email off, an account order has no guestEmail.
  const to = order.clientUser?.email ?? order.guestEmail;
  if (!to) return;
  if (order.clientUser && !wantsOrderUpdates(order.clientUser.notificationPrefs, "email")) return;

  const mail = orderConfirmationMail({
    name: order.clientUser?.name ?? null,
    orderNo: order.orderNo,
    gameName: order.gameName,
    option: order.option,
    priceEUR: Number(order.priceEUR),
    url: orderUrl(order),
  });

  await sendMail({ to, ...mail });
}

/**
 * The staff channel post for an order that just went out to dispatch.
 *
 * Webhook only. It used to DM every invited teammate the same embed, which
 * was the wrong channel for it twice over: an invitation expires in seconds
 * and a DM cannot be answered, so by the time anyone read it the order had
 * moved on — and it meant a teammate's DMs were mostly other people's orders
 * rather than anything about their own account. Invitations belong in the
 * dispatch panel, which pushes them live and has the buttons.
 *
 * So this is the operations feed: everything an admin would otherwise open
 * the dashboard to find out. Deliberately the fullest embed the product
 * sends — the opposite of the teammate DMs, which are one line each.
 */
async function pingTeammates(order: DispatchedOrder): Promise<void> {
  const rank = formatRank(order.gameSlug, order.ignRank, order.ignDivision);
  const seats = order.teammatesRequested === 1 ? "1 teammate" : `${order.teammatesRequested} teammates`;

  // Only what was actually answered. A row of "—" is not information, and on
  // a phone it is what pushes the useful rows off the card.
  const asked = [
    order.vibe && `Vibe · ${order.vibe}`,
    order.conversationPref && `Comms · ${order.conversationPref}`,
    order.playStylePref && `Play style · ${order.playStylePref}`,
  ].filter(Boolean);

  await postToTeammateChannel({
    title: "🔔 New request incoming",
    description: `**${order.option}** on **${order.gameName}** — looking for ${seats}.`,
    fields: [
      { name: "Order", value: `#${order.orderNo}`, inline: true },
      { name: "Rank", value: rank ?? "Unranked", inline: true },
      { name: "Region", value: order.ignRegion ? order.ignRegion.toUpperCase() : "Any", inline: true },
      { name: "Games", value: String(order.gamesBooked), inline: true },
      { name: "Price", value: `€${Number(order.priceEUR).toFixed(2)}`, inline: true },
      { name: "Payout", value: `€${Number(order.teammatePayoutEUR).toFixed(2)}`, inline: true },
      ...(order.ign ? [{ name: "Player", value: order.ign, inline: false }] : []),
      ...(asked.length > 0 ? [{ name: "Asked for", value: asked.join("\n"), inline: false }] : []),
    ],
    linkUrl: `${appUrl()}/dashboard/admin/orders/${order.orderNo}`,
    linkLabel: "Open in admin",
    color: ACCENT,
  });
}

/**
 * A teammate was picked.
 *
 * No longer mails. The customer is on the order screen watching this happen —
 * it updates live — and the ones who tabbed away come back to the same screen
 * still saying it. A mail for it landed in the gap between paying and playing,
 * which is minutes, and it was the single most common thing in a customer's
 * inbox from us. Mail is now the receipt, the outcome and the refund; the
 * things somebody needs to find again months later.
 *
 * Kept as a function rather than deleted at the call sites: assignment is
 * exactly the kind of event that earns a push notification later, and this is
 * where that would go.
 */
export async function notifyTeammateAssigned(_orderId: string): Promise<void> {
  return;
}


/**
 * The end of a session, mailed with the review ask in it.
 *
 * Separate from the bell notification the same event raises: that one is a
 * line of text in a feed, and this is the single best moment to ask how it
 * went — the session just ended, the customer still remembers, and the
 * rating is one tap inside the mail rather than a landing page that asks
 * them to decide twice.
 */
/**
 * An order ended without a session happening, and the money has been dealt
 * with. Says which, in the same mail.
 *
 * Reaches a guest as well as an account — `guestEmail` is the whole reason
 * that column exists, and a guest is the customer who most needs telling,
 * since they have no balance page to check and no bell to see.
 */
export async function notifyOrderCancelled(
  orderId: string,
  outcome: { reason: string; refund: { amount: string; detail: string } | null },
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { clientUser: { select: { email: true, name: true, notificationPrefs: true } } },
    });
    if (!order) return;

    const to = order.clientUser?.email ?? order.guestEmail;
    if (!to) return;
    if (order.clientUser && !wantsOrderUpdates(order.clientUser.notificationPrefs, "email")) return;

    await sendMail({
      to,
      ...orderCancelledMail({
        name: order.clientUser?.name ?? null,
        orderNo: order.orderNo,
        gameName: order.gameName,
        option: order.option,
        reason: outcome.reason,
        refund: outcome.refund,
        // Nothing to come back to on the order itself — it is over. Point at
        // the game so "book again" is one click rather than a search.
        url: `${appUrl()}/games/${encodeURIComponent(order.gameSlug)}`,
      }),
    });
  } catch (err) {
    console.error("[notify] cancellation mail failed:", orderId, err);
  }
}

export async function notifyOrderCompleted(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        clientUser: { select: { email: true, name: true, notificationPrefs: true } },
        candidates: { where: { selected: true, isPrimary: true }, select: { teammate: { select: { name: true } } } },
        _count: { select: { games: true } },
      },
    });
    if (!order) return;

    const to = order.clientUser?.email ?? order.guestEmail;
    if (!to) return;
    if (order.clientUser && !wantsOrderUpdates(order.clientUser.notificationPrefs, "email")) return;

    await sendMail({
      to,
      ...orderCompletedMail({
        name: order.clientUser?.name ?? null,
        orderNo: order.orderNo,
        gameName: order.gameName,
        option: order.option,
        teammateName: order.candidates[0]?.teammate.name ?? null,
        gamesPlayed: order._count.games,
        url: orderUrl(order),
      }),
    });
  } catch (err) {
    console.error("[notify] completion mail failed:", orderId, err);
  }
}
