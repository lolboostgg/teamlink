export const NOTIFICATION_CHANNELS = ["email", "discord", "sms"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const CHANNEL_META: Record<NotificationChannel, { label: string; icon: string }> = {
  email: { label: "Email", icon: "fa-solid fa-envelope" },
  discord: { label: "Discord", icon: "fa-brands fa-discord" },
  sms: { label: "SMS", icon: "fa-solid fa-mobile-screen" },
};

export const NOTIFICATION_TOPICS = [
  {
    key: "promotions",
    label: "Promotions & newsletter",
    description: "Weekly campaigns, discounts and platform news",
  },
  {
    key: "orders",
    label: "Order updates",
    description: "Matchmaking, teammate assignment and session progress",
  },
  {
    key: "balance",
    label: "Balance updates",
    description: "Top-ups, refunds and anything that moves your store credit",
  },
] as const;

export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number]["key"];
export type NotificationPrefs = Record<string, Record<NotificationChannel, boolean>>;

/** Everything on by default — an unset account still gets its order updates. */
export function defaultPrefs(): NotificationPrefs {
  const out: NotificationPrefs = {};
  for (const topic of NOTIFICATION_TOPICS) {
    out[topic.key] = { email: true, discord: true, sms: false };
  }
  return out;
}

/** Drops unknown topics and channels rather than trusting the request body. */
export function sanitizeNotificationPrefs(raw: unknown): NotificationPrefs {
  const base = defaultPrefs();
  if (!raw || typeof raw !== "object") return base;

  for (const topic of NOTIFICATION_TOPICS) {
    const value = (raw as Record<string, unknown>)[topic.key];
    if (!value || typeof value !== "object") continue;
    for (const channel of NOTIFICATION_CHANNELS) {
      const flag = (value as Record<string, unknown>)[channel];
      if (typeof flag === "boolean") base[topic.key][channel] = flag;
    }
  }

  return base;
}
