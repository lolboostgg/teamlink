/**
 * Outbound Discord messages.
 *
 * Two channels, deliberately both: a webhook post into the teammate channel is
 * the broadcast everyone sees, and a bot DM reaches the specific teammates an
 * order was actually dispatched to. A teammate who has DMs closed still sees
 * the channel post; one who mutes the channel still gets the DM.
 *
 * The DM path mirrors what the PHP site already does in production
 * (discord_message_notification.php): open a DM channel against the bot token,
 * then post to it. Discord has no "message this user" endpoint — the channel
 * has to be opened first, and it fails when the bot shares no guild with the
 * recipient or the recipient blocks DMs from server members.
 *
 * Every function here swallows its errors. A Discord outage must not fail an
 * order.
 */

const API = "https://discord.com/api/v10";
const USER_AGENT = "TeamLink (https://gaming.lolboost.gg, 1.0)";

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordMessage {
  title: string;
  description: string;
  fields?: DiscordEmbedField[];
  /** Renders as a link button under the embed. */
  linkUrl?: string;
  linkLabel?: string;
  /** Left edge colour of the embed, as a decimal int. */
  color?: number;
}

/** TeamLink accent (#4066ff) as Discord wants it. */
export const ACCENT = 0x4066ff;

function buildPayload(message: DiscordMessage) {
  return {
    embeds: [
      {
        title: message.title,
        description: message.description,
        color: message.color ?? ACCENT,
        fields: message.fields ?? [],
        timestamp: new Date().toISOString(),
      },
    ],
    ...(message.linkUrl
      ? {
          components: [
            {
              type: 1,
              components: [{ type: 2, style: 5, label: message.linkLabel ?? "Open", url: message.linkUrl }],
            },
          ],
        }
      : {}),
  };
}

export function isDiscordWebhookConfigured(): boolean {
  return Boolean(process.env.DISCORD_TEAMMATE_WEBHOOK_URL);
}

export function isDiscordBotConfigured(): boolean {
  return Boolean(process.env.DISCORD_BOT_TOKEN);
}

/** Broadcast into the teammate channel. */
export async function postToTeammateChannel(message: DiscordMessage): Promise<boolean> {
  const url = process.env.DISCORD_TEAMMATE_WEBHOOK_URL;
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify(buildPayload(message)),
      cache: "no-store",
    });
    if (!res.ok) console.error("[discord] webhook failed:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("[discord] webhook error:", err);
    return false;
  }
}

/** Opens (or reuses — Discord is idempotent here) the bot's DM channel. */
async function openDmChannel(discordUserId: string, botToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ recipient_id: discordUserId }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[discord] open DM failed:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch (err) {
    console.error("[discord] open DM error:", err);
    return null;
  }
}

/** Direct message one teammate. Returns false when Discord refused it. */
export async function sendDiscordDm(discordUserId: string, message: DiscordMessage): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !discordUserId) return false;

  const channelId = await openDmChannel(discordUserId, botToken);
  if (!channelId) return false;

  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(buildPayload(message)),
      cache: "no-store",
    });

    if (!res.ok) console.error("[discord] DM failed:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("[discord] DM error:", err);
    return false;
  }
}

/**
 * DMs several teammates at once.
 *
 * Sequential on purpose. Discord rate-limits per route, and a dispatch fans
 * out to at most five teammates — firing them in parallel buys a few hundred
 * milliseconds and risks a 429 that costs the whole batch.
 */
export async function sendDiscordDms(discordUserIds: string[], message: DiscordMessage): Promise<number> {
  let sent = 0;
  for (const id of discordUserIds) {
    if (await sendDiscordDm(id, message)) sent++;
  }
  return sent;
}
