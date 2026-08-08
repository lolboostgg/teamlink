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
 * Customer-facing mail is deliberately thin. Every mail nobody wanted is a
 * spam click, and spam clicks cost us the deliverability of the mails that
 * actually matter.
 */
interface ChannelPolicy {
  discord?: boolean;
  email?: boolean;
  /** Which preference topic the recipient's settings are read under. */
  topic?: "orders" | "balance" | "promotions";
}

const POLICY: Record<string, ChannelPolicy> = {
  // ── Teammate side ────────────────────────────────────────────
  // Five minutes unanswered is a nudge; half an hour means Discord wasn't
  // read either, so it escalates to mail.
  "order.unread": { discord: true, topic: "orders" },
  "order.unread_escalated": { discord: true, email: true, topic: "orders" },
  "order.reviewed": { discord: true, topic: "orders" },

  // Money in, not money out — a tip is the customer saying thank you and is
  // worth hearing about while the good mood is still there.
  "tip.received": { discord: true, topic: "balance" },

  // Money: both channels, always.
  "payout.paid": { discord: true, email: true, topic: "balance" },
  "payout.rejected": { discord: true, email: true, topic: "balance" },

  // ── Customer side ────────────────────────────────────────────
  // "Your teammate is here" is mailed from orderNotifications.ts instead,
  // where the session details are to hand.
  "order.completed": { email: true, topic: "orders" },
  "order.abandoned": { email: true, topic: "orders" },

  // Money owed to somebody who cannot be paid automatically. Mailed as well
  // as belled, because a guest refund waits until a person acts on it.
  "order.refund_due": { email: true, topic: "balance" },

  // Deliberately bell-only: the recipient is looking at the screen it
  // happened on, or it is an admin who lives in the dashboard anyway.
  "order.games_added": {},
  "payout.requested": {},
  "teammate.joined": {},
  "verification.submitted": {},
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
  "order.unread": { emoji: "\u{1F4AC}", color: 0x4066ff },
  "order.unread_escalated": { emoji: "\u{1F4AC}", color: 0xf5a524 },
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
      select: { email: true, name: true, discordId: true, notificationPrefs: true },
    });
    if (!user) return;

    const url = notice.href ? `${appUrl()}${notice.href.startsWith("/") ? "" : "/"}${notice.href}` : appUrl();
    const look = PRESENTATION[notice.type] ?? { emoji: "\u{1F514}", color: ACCENT };
    const jobs: Promise<unknown>[] = [];

    if (policy.discord && user.discordId && wants(user.notificationPrefs, policy.topic, "discord")) {
      jobs.push(
        sendDiscordDm(user.discordId, {
          title: `${look.emoji} ${notice.title}`,
          description: notice.body ?? "",
          fields: notice.fields,
          linkUrl: url,
          linkLabel: "Open TeamLink",
          color: look.color,
        }),
      );
    }

    if (policy.email && user.email && wants(user.notificationPrefs, policy.topic, "email")) {
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
