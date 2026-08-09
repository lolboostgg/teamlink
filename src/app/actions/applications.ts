"use server";

import { headers } from "next/headers";
import { COMPANY } from "@/lib/company";
import { sendMail } from "@/lib/notify/mail";
import { notifyAdmins } from "@/lib/notifications/service";

/**
 * The two public, unauthenticated forms: applying to be a teammate, and
 * contacting support without an account.
 *
 * Both land in the same place — a mail to the support inbox plus a bell for
 * every admin. There is deliberately no table behind them: a new Prisma model
 * needs a migration run against the live database before the code that reads
 * it deploys, and an application form is not worth that coupling. The inbox is
 * the record, and it is the inbox the team already lives in.
 */

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/** Field caps, so a form post can't be used to mail a novel to support. */
const LIMITS = { short: 120, medium: 400, long: 4000 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Mail bodies are assembled as HTML, so anything typed has to be inert. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A crude per-IP throttle.
 *
 * Process-local, so it resets on redeploy and does not see other instances —
 * it is not a security control and is not pretending to be one. It exists for
 * the one failure mode that actually costs us something: a script holding the
 * submit button down and burning the SMTP mailbox's reputation. Real abuse is
 * caught by the honeypot below and, past that, by a human.
 */
const RECENT = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;

async function throttled(): Promise<boolean> {
  const list = await headers();
  const ip = (list.get("x-forwarded-for") ?? list.get("cf-connecting-ip") ?? "unknown").split(",")[0].trim();

  const now = Date.now();
  const hits = (RECENT.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  RECENT.set(ip, hits);

  // The map is only ever as big as the IPs seen in the last window; sweeping
  // on write keeps it from growing for the lifetime of the process.
  if (RECENT.size > 500) {
    for (const [key, times] of RECENT) {
      if (times.every((t) => now - t >= WINDOW_MS)) RECENT.delete(key);
    }
  }

  return hits.length > MAX_PER_WINDOW;
}

interface Delivery {
  subject: string;
  rows: [string, string][];
  message?: string;
  notification: { type: string; title: string; body: string; href: string };
}

async function deliver({ subject, rows, message, notification }: Delivery): Promise<SubmitResult> {
  const html = [
    `<h2 style="font:600 18px system-ui">${escapeHtml(subject)}</h2>`,
    "<table style=\"font:14px system-ui;border-collapse:collapse\">",
    ...rows
      .filter(([, value]) => value)
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top">${escapeHtml(label)}</td>` +
          `<td style="padding:4px 0"><b>${escapeHtml(value)}</b></td></tr>`,
      ),
    "</table>",
    message ? `<p style="font:14px/1.6 system-ui;white-space:pre-wrap">${escapeHtml(message)}</p>` : "",
  ].join("");

  const text = [
    subject,
    "",
    ...rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    message ? `\n${message}` : "",
  ].join("\n");

  const mailed = await sendMail({ to: COMPANY.support, subject, html, text });

  // The bell regardless of whether the mailbox is configured in this
  // environment — losing an application because SMTP is down is the one
  // outcome worth guarding against.
  await notifyAdmins(notification);

  // sendMail is best-effort by design and the admins have been notified
  // either way, so a dead mailbox is not the submitter's problem to see.
  if (!mailed) console.warn("[applications] mail not sent:", subject);

  return { ok: true };
}

export interface TeammateApplicationInput {
  name: string;
  email: string;
  discord: string;
  country: string;
  games: string;
  ranks: string;
  hours: string;
  experience: string;
  /** Must stay empty — bots fill every field they are given. */
  website?: string;
}

export async function submitTeammateApplication(raw: TeammateApplicationInput): Promise<SubmitResult> {
  if (clean(raw.website, LIMITS.short)) return { ok: true }; // honeypot: look successful, do nothing

  const name = clean(raw.name, LIMITS.short);
  const email = clean(raw.email, LIMITS.short);
  const discord = clean(raw.discord, LIMITS.short);
  const country = clean(raw.country, LIMITS.short);
  const games = clean(raw.games, LIMITS.medium);
  const ranks = clean(raw.ranks, LIMITS.medium);
  const hours = clean(raw.hours, LIMITS.short);
  const experience = clean(raw.experience, LIMITS.long);

  if (!name || !email || !discord || !games) {
    return { ok: false, error: "Name, email, Discord and the games you play are all needed." };
  }
  if (!EMAIL.test(email)) return { ok: false, error: "That email address doesn't look right." };
  if (await throttled()) {
    return { ok: false, error: "That's a few applications in a row — give it a few minutes." };
  }

  return deliver({
    subject: `Teammate application — ${name}`,
    rows: [
      ["Name", name],
      ["Email", email],
      ["Discord", discord],
      ["Country", country],
      ["Games", games],
      ["Ranks", ranks],
      ["Hours per week", hours],
    ],
    message: experience,
    notification: {
      type: "teammate.application",
      title: "New teammate application",
      body: `${name} (${discord}) — ${games}`,
      href: "/dashboard/admin/onboarding",
    },
  });
}

export interface ContactMessageInput {
  name: string;
  email: string;
  topic: string;
  orderNo: string;
  message: string;
  website?: string;
}

export async function submitContactMessage(raw: ContactMessageInput): Promise<SubmitResult> {
  if (clean(raw.website, LIMITS.short)) return { ok: true };

  const name = clean(raw.name, LIMITS.short);
  const email = clean(raw.email, LIMITS.short);
  const topic = clean(raw.topic, LIMITS.short);
  const orderNo = clean(raw.orderNo, LIMITS.short);
  const message = clean(raw.message, LIMITS.long);

  if (!name || !email || !message) {
    return { ok: false, error: "We need a name, an email and a message to reply to." };
  }
  if (!EMAIL.test(email)) return { ok: false, error: "That email address doesn't look right." };
  if (await throttled()) {
    return { ok: false, error: "That's a few messages in a row — give it a few minutes." };
  }

  return deliver({
    subject: `Contact form — ${topic || "General"} — ${name}`,
    rows: [
      ["Name", name],
      ["Email", email],
      ["Topic", topic],
      ["Order", orderNo],
    ],
    message,
    notification: {
      type: "contact.message",
      title: `Contact form: ${topic || "General"}`,
      body: `${name} <${email}>`,
      href: "/dashboard/admin",
    },
  });
}
