import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/notify/mail";
import { sendDiscordDm, ACCENT } from "@/lib/notify/discordNotify";
import { plainNoticeMail } from "@/lib/notify/templates";
import { appUrl } from "@/lib/notify/orderNotifications";
import { sanitizeNotificationPrefs, type NotificationChannel } from "@/lib/notificationPrefs";

/**
 * Which outside channels each in-app notification also goes out on.
 *
 * Every platform event already writes a bell row through notifyUser(), so this
 * is the one place that decides what else happens — rather than each caller
 * remembering to mail, DM and write a row in three separate steps and getting
 * one of them wrong.
 *
 * The split follows what the channel is good at. Discord reaches a teammate
 * who is mid-game with the client open, so it carries anything that wants a
 * reaction now. Email is for money and consequences: it has to be findable
 * again months later, and it is the only channel that survives someone
 * uninstalling Discord. Everything gets the bell regardless; it costs nothing.
 *
 * Mail is deliberately thin, and thinner still since it was measured. Every
 * mail nobody wanted is a spam click, and spam clicks cost us the
 * deliverability of the ones that matter — the receipt and the refund notice.
 * What a type is *allowed* to send is only half the rule; who is receiving it
 * is the other half, and that lives in EMAIL_BY_ROLE below.
 */
interface ChannelPolicy {
  discord?: boolean;
  email?: boolean;
  /** Which preference topic the recipient's settings are read under. */
  topic?: "orders" | "balance" | "promotions";
}

/**
 * Who may be emailed about what, by the recipient's own role.
 *
 * The policy table below says what a *type* can do; this says what a *person*
 * should get, and both have to agree before a mail is sent. It exists because
 * the same event reaches different people through the same entry:
 * notifyAdmins() fans an order completion out with the identical type the
 * customer gets, so every admin was mailed about every finished order —
 * hundreds of mails a week to people who live in the dashboard and can see
 * the same thing on a page.
 *
 * An allow-list rather than a block-list, so a new event type is silent to
 * everyone until somebody decides otherwise. Getting that wrong in the other
 * direction is how a product starts mailing people by accident.
 */
const EMAIL_BY_ROLE: Record<string, ReadonlySet<string>> = {
  // Nothing, ever. An admin is looking at the dashboard the event happened
  // on; mail adds no information and buries the mails that do.
  ADMIN: new Set(),

  // Money leaving the platform, and nothing else. A teammate lives in the
  // dispatch panel and on Discord — an order to answer is worth a DM and is
  // worthless as mail, since it has expired by the time it is read.
  TEAMMATE: new Set(["payout.paid", "payout.rejected", "dispute.resolved"]),

  // Money and outcomes: what was paid, what it produced, and what came back.
  // The confirmation and the session-complete mails are sent from
  // orderNotifications.ts, where the order detail is to hand.
  CLIENT: new Set(["order.abandoned", "order.refund_due", "dispute.resolved"]),
};

function mayEmail(role: string | undefined, type: string): boolean {
  return EMAIL_BY_ROLE[role ?? "CLIENT"]?.has(type) ?? false;
}

const POLICY: Record<string, ChannelPolicy> = {
  // ── Teammate side ────────────────────────────────────────────
  //
  // A teammate's DMs are about their own account and nothing else: their
  // rating, their money, and a customer waiting on a reply. Orders on offer
  // are not in here on purpose — an invitation lives for seconds and cannot
  // be answered from a DM, so it was noise by the time it arrived, and it
  // buried the messages that were actually about them.
  // Both are Discord nudges. The escalation used to reach for mail after half
  // an hour, which is well past the point an unread message is still actionable
  // — it arrived as a record of something already missed.
  "order.unread": { discord: true, topic: "orders" },
  "order.unread_escalated": { discord: true, topic: "orders" },
  "order.reviewed": { discord: true, topic: "orders" },

  // The customer picked *them*, and is now sitting in a lobby waiting for an
  // invite. This is the opposite case to a dispatch invitation: that one
  // lives for fifteen seconds and cannot be answered from a DM, so it stays
  // out of here — this one has already been decided, and the longer it takes
  // to reach somebody who is mid-game the worse the session starts. It was
  // bell-only, which a teammate in a fullscreen client never sees.
  "order.assigned": { discord: true, topic: "orders" },

  // Money in, not money out — a tip is the customer saying thank you and is
  // worth hearing about while the good mood is still there.
  "tip.received": { discord: true, topic: "balance" },

  // Money: both channels, always.
  "payout.paid": { discord: true, email: true, topic: "balance" },
  "payout.rejected": { discord: true, email: true, topic: "balance" },

  // ── Customer side ────────────────────────────────────────────
  // order.completed is bell-only here on purpose: notifyOrderCompleted sends
  // the real mail, with the review ask in it, and this entry was sending a
  // second plain one alongside it to the same person for the same event.
  "order.completed": {},
  "order.abandoned": { email: true, topic: "orders" },

  // Money owed to somebody who cannot be paid automatically. Mailed as well
  // as belled, because a guest refund waits until a person acts on it.
  "order.refund_due": { email: true, topic: "balance" },

  // Deliberately bell-only: the recipient is looking at the screen it
  // happened on, or it is an admin who lives in the dashboard anyway.
  "order.games_added": { discord: true, topic: "orders" },
  "payout.requested": {},
  "teammate.joined": {},
  "verification.submitted": {},

  // ── Support tickets ──────────────────────────────────────────
  //
  // The exception to "admins are bell-only": support has no dispatch panel
  // anybody is already staring at, and a ticket that waits until somebody
  // happens to open /dashboard/admin/disputes is a ticket answered a day
  // late. Discord DM rather than mail, because it wants a reaction now and
  // is worthless as a record — the ticket itself is the record. Mail stays
  // off for admins by EMAIL_BY_ROLE regardless of what is set here.
  "dispute.opened": { discord: true, topic: "orders" },

  // Somebody is waiting on an answer at the other end of this, on both
  // sides — a reply that sits unread for a day is the same as no reply.
  // Discord and not mail: it wants a reaction, and the thread on the ticket
  // page is already the durable copy.
  "dispute.replied": { discord: true, topic: "orders" },

  // Admin-facing, and the point is to stop work already under way, so it has
  // to arrive rather than wait to be noticed.
  "dispute.closed": { discord: true, topic: "orders" },

  // A status change is a nudge, not news: bell only, so a ticket moving
  // through three states doesn't produce three DMs about nothing.
  "dispute.updated": {},

  // The outcome, and usually money with it. This is the one somebody goes
  // looking for weeks later, which is exactly what mail is for.
  "dispute.resolved": { discord: true, email: true, topic: "balance" },
};

/** Types that write a bell row but have no policy entry get nothing extra —
 * silence is the default, so a new event has to opt in to reaching people
 * outside the app. */

function wants(prefsJson: unknown, topic: ChannelPolicy["topic"], channel: NotificationChannel): boolean {
  const prefs = sanitizeNotificationPrefs(prefsJson);
  return prefs[topic ?? "orders"]?.[channel] ?? true;
}

interface Notice {
  type: string;
  title: string;
  body?: string;
  href?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}

/**
 * How each kind of event presents itself in Discord.
 *
 * A chat client is not an inbox: messages are scanned in a column of dozens,
 * and an embed is placed by its coloured edge and its glyph before it is
 * read. Every notice used to arrive in the same blue under the same plain
 * title, so a rejected payout and a five-star review looked alike.
 *
 * Colours are Discord's decimal ints, matching the app's own semantics.
 */
const PRESENTATION: Record<string, { emoji: string; color: number }> = {
  "tip.received": { emoji: "\u{1F4B0}", color: 0x2fbf71 },
  "order.reviewed": { emoji: "\u{2B50}", color: 0xf5b301 },
  "order.completed": { emoji: "\u{1F3C1}", color: 0x2fbf71 },
  "payout.paid": { emoji: "\u{1F4B8}", color: 0x2fbf71 },
  "payout.rejected": { emoji: "\u{26A0}\u{FE0F}", color: 0xe5484d },
  "order.cancel_requested": { emoji: "\u{1F6D1}", color: 0xe5484d },
  "order.refund_due": { emoji: "\u{1F4B3}", color: 0xf5a524 },
  "order.abandoned": { emoji: "\u{1F4A4}", color: 0xf5a524 },
  "order.assigned": { emoji: "\u{1F3AF}", color: 0x2fbf71 },
  "order.unread": { emoji: "\u{1F4AC}", color: 0x4066ff },
  "order.unread_escalated": { emoji: "\u{1F4AC}", color: 0xf5a524 },
  "dispute.opened": { emoji: "\u{1F3AB}", color: 0xe5484d },
  "dispute.updated": { emoji: "\u{1F50D}", color: 0xf5a524 },
  "dispute.replied": { emoji: "\u{1F4E9}", color: 0x4066ff },
  "dispute.closed": { emoji: "\u{1F513}", color: 0xf5a524 },
  "dispute.resolved": { emoji: "\u{2705}", color: 0x2fbf71 },
};

/**
 * Fans one notification out beyond the bell.
 *
 * Never throws and is never awaited by a caller doing real work: a Discord
 * outage or a dead mailbox must not roll back the thing being announced.
 */
export async function deliverExternally(userId: string, notice: Notice): Promise<void> {
  const policy = POLICY[notice.type];
  if (!policy || (!policy.discord && !policy.email)) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, discordId: true, notificationPrefs: true, role: true },
    });
    if (!user) return;

    const url = notice.href ? `${appUrl()}${notice.href.startsWith("/") ? "" : "/"}${notice.href}` : appUrl();
    const look = PRESENTATION[notice.type] ?? { emoji: "\u{1F514}", color: ACCENT };
    const jobs: Promise<unknown>[] = [];

    if (policy.discord && user.discordId && wants(user.notificationPrefs, policy.topic, "discord")) {
      // Deliberately plain: a title, one line, a link. No field table — the
      // fields are for the operations feed in the staff channel, where an
      // admin is triaging several orders at once. A teammate reading "your
      // payout was sent" does not need it laid out in three columns, and a
      // DM that looks like a report is one that gets skimmed.
      jobs.push(
        sendDiscordDm(user.discordId, {
          title: `${look.emoji} ${notice.title}`,
          description: notice.body ?? "",
          linkUrl: url,
          linkLabel: "Open QUP.gg",
          color: look.color,
        }),
      );
    }

    // Both gates, not either: the type has to allow mail *and* this recipient
    // has to be someone we mail about it. The preference check stays on top of
    // both — a customer who turned order mail off still gets nothing.
    if (
      policy.email &&
      mayEmail(user.role, notice.type) &&
      user.email &&
      wants(user.notificationPrefs, policy.topic, "email")
    ) {
      jobs.push(
        sendMail({
          to: user.email,
          ...plainNoticeMail({
            name: user.name,
            heading: notice.title,
            body: notice.body ?? "",
            url,
          }),
        }),
      );
    }

    await Promise.allSettled(jobs);
  } catch (err) {
    console.error("[notify] external delivery failed:", notice.type, err);
  }
}
