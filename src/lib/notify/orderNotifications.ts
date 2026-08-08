import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/notify/mail";
import { orderConfirmationMail, orderCompletedMail, teammateAssignedMail } from "@/lib/notify/templates";
import { postToTeammateChannel, sendDiscordDms, ACCENT } from "@/lib/notify/discordNotify";
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
        candidates: {
          select: {
            teammate: {
              select: { name: true, user: { select: { discordId: true, notificationPrefs: true } } },
            },
          },
        },
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
  gameName: string;
  option: string;
  priceEUR: unknown;
  teammatesRequested: number;
  guestEmail: string | null;
  ign: string | null;
  ignRegion: string | null;
  clientUser: { email: string; name: string | null; notificationPrefs: unknown } | null;
  candidates: { teammate: { name: string; user: { discordId: string | null; notificationPrefs: unknown } | null } }[];
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

async function pingTeammates(order: DispatchedOrder): Promise<void> {
  const message = {
    title: "New order",
    description: `A **${order.option}** session on **${order.gameName}** is looking for ${
      order.teammatesRequested === 1 ? "a teammate" : `${order.teammatesRequested} teammates`
    }.`,
    fields: [
      { name: "Order", value: `#${order.orderNo}`, inline: true },
      { name: "Game", value: order.gameName, inline: true },
      { name: "Mode", value: order.option, inline: true },
      ...(order.ign ? [{ name: "Player", value: `${order.ign}${order.ignRegion ? ` (${order.ignRegion})` : ""}`, inline: false }] : []),
    ],
    linkUrl: `${appUrl()}/dashboard/teammate`,
    linkLabel: "Open dashboard",
    color: ACCENT,
  };

  // The broadcast goes out regardless of who was invited — the channel is how
  // the roster sees there is work, and a declined invite frees the slot for
  // whoever reads it there.
  const channelPost = postToTeammateChannel(message);

  const discordIds = order.candidates
    .map((c) => c.teammate.user)
    .filter((user) => user?.discordId && wantsOrderUpdates(user.notificationPrefs, "discord"))
    .map((user) => user!.discordId!);

  await Promise.allSettled([channelPost, sendDiscordDms(discordIds, message)]);
}

/**
 * A teammate was picked. The customer already sees this live on the order
 * screen, so this is only for whoever tabbed away.
 */
export async function notifyTeammateAssigned(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        clientUser: { select: { email: true, name: true, notificationPrefs: true } },
        candidates: { where: { selected: true }, select: { teammate: { select: { name: true } } } },
      },
    });
    if (!order) return;

    const to = order.clientUser?.email ?? order.guestEmail;
    if (!to) return;
    if (order.clientUser && !wantsOrderUpdates(order.clientUser.notificationPrefs, "email")) return;

    const names = order.candidates.map((c) => c.teammate.name);
    if (names.length === 0) return;

    await sendMail({
      to,
      ...teammateAssignedMail({
        orderNo: order.orderNo,
        gameName: order.gameName,
        teammateNames: names,
        url: orderUrl(order),
      }),
    });
  } catch (err) {
    console.error("[notify] assignment notification failed:", orderId, err);
  }
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
