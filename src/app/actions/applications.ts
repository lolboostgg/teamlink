"use server";

import { headers } from "next/headers";
import { COMPANY } from "@/lib/company";
import { sendMail } from "@/lib/notify/mail";
import { notifyAdmins } from "@/lib/notifications/service";
import { prisma } from "@/lib/db";
import { inviteState } from "@/lib/teammateInvites";
import { countryName } from "@/lib/countries";
import { getGameBySlug } from "@/lib/games";

/**
 * The two public, unauthenticated forms: applying to be a teammate, and
 * contacting support without an account.
 *
 * A teammate application is a row (see TeammateApplication) because somebody
 * has to work through them: accept, decline, or delete, from
 * /dashboard/admin/applications. A contact message is not — it is a
 * conversation, and it belongs in the inbox the team already lives in.
 *
 * Both also ring every admin's bell, so nothing waits on a mailbox being
 * configured in a given environment.
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
  /** Game slugs, so the admin list can render the same icons as the site. */
  games: string[];
  ranks: string;
  hours: string;
  experience: string;
  /** Must stay empty — bots fill every field they are given. */
  website?: string;
}

/**
 * One address, one application.
 *
 * Three different things can already own an email, and each deserves its own
 * answer — "you already applied" is useless to somebody who is *already a
 * teammate* and has simply forgotten. A client account with the same address
 * is fine and deliberately not checked: plenty of teammates buy sessions too.
 */
async function emailIsTaken(email: string): Promise<string | null> {
  const [existing, account, invites] = await Promise.all([
    prisma.teammateApplication.findUnique({ where: { email }, select: { status: true } }),
    prisma.user.findUnique({ where: { email }, select: { role: true } }),
    prisma.teammateInvite.findMany({
      where: { email },
      select: { usedAt: true, revokedAt: true, expiresAt: true },
    }),
  ]);

  if (account?.role === "TEAMMATE" || account?.role === "ADMIN") {
    return "That email already has a teammate account. Sign in instead — or write to us if you cannot get in.";
  }
  if (existing?.status === "PENDING") {
    return "We already have an application from this address. Give us a couple of days to get to it.";
  }
  if (existing?.status === "INVITED") {
    return "You have already been accepted — your invite link is in your inbox. Check spam, or ask us to resend it.";
  }
  if (existing) {
    return "We have looked at an application from this address already. Write to us if something has changed.";
  }
  if (invites.some((invite) => inviteState(invite) === "open")) {
    return "There is already an open invite for that address — check your inbox.";
  }
  return null;
}

export async function submitTeammateApplication(raw: TeammateApplicationInput): Promise<SubmitResult> {
  if (clean(raw.website, LIMITS.short)) return { ok: true }; // honeypot: look successful, do nothing

  const name = clean(raw.name, LIMITS.short);
  const email = clean(raw.email, LIMITS.short).toLowerCase();
  const discord = clean(raw.discord, LIMITS.short);
  const country = clean(raw.country, LIMITS.short);
  const games = (Array.isArray(raw.games) ? raw.games : []).slice(0, 20).map((g) => clean(g, 60)).filter(Boolean);
  const ranks = clean(raw.ranks, LIMITS.medium);
  const hours = clean(raw.hours, LIMITS.short);
  const experience = clean(raw.experience, LIMITS.long);

  if (!name || !email || !discord || games.length === 0) {
    return { ok: false, error: "Name, email, Discord and the games you play are all needed." };
  }
  if (!EMAIL.test(email)) return { ok: false, error: "That email address doesn't look right." };
  if (await throttled()) {
    return { ok: false, error: "That's a few applications in a row — give it a few minutes." };
  }

  const taken = await emailIsTaken(email);
  if (taken) return { ok: false, error: taken };

  try {
    await prisma.teammateApplication.create({
      data: { name, email, discord, country: country || null, games, ranks: ranks || null, hours: hours || null, experience: experience || null },
    });
  } catch (error) {
    // Two submissions racing past emailIsTaken land here on the unique index.
    // The applicant gets the same answer either way.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { ok: false, error: "We already have an application from this address." };
    }
    throw error;
  }

  // The row stores codes and slugs; a mail is read by a person, so it gets
  // the names.
  const gameNames = games.map((slug) => getGameBySlug(slug)?.name ?? slug).join(", ");

  return deliver({
    subject: `Teammate application — ${name}`,
    rows: [
      ["Name", name],
      ["Email", email],
      ["Discord", discord],
      ["Country", countryName(country) ?? country],
      ["Games", gameNames],
      ["Ranks", ranks],
      ["Hours per week", hours],
    ],
    message: experience,
    notification: {
      type: "teammate.application",
      title: "New teammate application",
      body: `${name} (${discord}) — ${gameNames}`,
      href: "/dashboard/admin/applications",
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
