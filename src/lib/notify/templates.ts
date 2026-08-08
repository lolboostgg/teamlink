/**
 * Mail bodies.
 *
 * Table-based layout with inline styles on purpose — Outlook still ignores
 * most of a <style> block, and flexbox does not survive Gmail. Every mail
 * ships a plain-text alternative too: HTML-only mail scores badly with spam
 * filters, and the text part is what a watch or a screen reader reads out.
 *
 * The palette matches the app (see globals.css :root) so a mail and the order
 * screen it links to read as the same product.
 *
 * There is deliberately not a single <img> in here. Most clients block remote
 * images until the reader asks for them, and Gmail strips SVG outright — a
 * masthead built from an image is a broken-image icon sitting exactly where
 * the brand should be, for a large share of readers, on first open.
 * Everything visual is built from type, colour and table cells, which no
 * client can refuse to render.
 */

const BG = "#060811";
const CARD = "#0d1120";
const PANEL = "#131829";
const BORDER = "#232838";
const TEXT = "#f3f4f8";
const MUTED = "#9a9db0";
const FAINT = "#6c6f80";
const ACCENT = "#4066ff";
const CYAN = "#22d3ee";
const PURPLE = "#a855f7";
const GOLD = "#f5b301";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif";

/**
 * Who is writing, and from where.
 *
 * Transactional mail into the EU and UK is expected to identify its sender,
 * and a footer naming a real company at a real address is also the cheapest
 * thing you can do both for deliverability and for a reader deciding whether
 * this is a phishing attempt.
 */
const COMPANY = {
  legalName: "LB Gaming Services LTD",
  address: "71-75 Shelton Street, London, United Kingdom",
  site: "https://gaming.lolboost.gg",
  discord: "https://discord.gg/lolboost",
  support: "support@lolboost.gg",
};

const SOCIALS: { label: string; url: string }[] = [
  { label: "Discord", url: COMPANY.discord },
  { label: "Instagram", url: "https://instagram.com/lolboost.gg" },
  { label: "TikTok", url: "https://tiktok.com/@lolboost.gg" },
  { label: "X", url: "https://x.com/lolboostgg" },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(eur: number): string {
  return `€${eur.toFixed(2)}`;
}

interface Shell {
  heading: string;
  intro: string;
  rows: { label: string; value: string }[];
  ctaLabel: string;
  ctaUrl: string;
  footnote: string;
  /** The one number the mail is about — shown large above the detail rows. */
  highlight?: { label: string; value: string };
  /** The grey line clients show next to the subject in the inbox list. */
  preheader?: string;
  /** A one-click rating row. Only worth showing once there is something to
   * rate — see orderCompletedMail. */
  review?: { question: string; hint: string; urlForScore: (score: number) => string };
}

function shell({ heading, intro, rows, ctaLabel, ctaUrl, footnote, highlight, preheader, review }: Shell): string {
  // A row per line with its own divider rather than one rule above the block:
  // at four or five rows the flat list ran together.
  const rowsHtml = rows
    .map(
      (row, index) => `
        <tr>
          <td style="padding:11px 0;font-size:14px;line-height:1.4;color:${MUTED};${index > 0 ? `border-top:1px solid ${BORDER};` : ""}">${escapeHtml(row.label)}</td>
          <td style="padding:11px 0;font-size:14px;line-height:1.4;color:${TEXT};font-weight:700;text-align:right;${index > 0 ? `border-top:1px solid ${BORDER};` : ""}">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join("");

  const rowsBlock = rows.length
    ? `<tr>
              <td style="padding:6px 30px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${FONT};">
                  ${rowsHtml}
                </table>
              </td>
            </tr>`
    : "";

  const highlightBlock = highlight
    ? `<tr>
              <td style="padding:24px 30px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL};border:1px solid ${BORDER};border-radius:12px;">
                  <tr>
                    <td style="padding:16px 18px;font-family:${FONT};">
                      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${FAINT};">${escapeHtml(highlight.label)}</div>
                      <div style="margin-top:4px;font-size:26px;font-weight:800;color:${TEXT};line-height:1.15;">${escapeHtml(highlight.value)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : "";

  // Five one-click links rather than one "leave a review" button. Somebody
  // who has already decided it was five stars should not have to decide again
  // on a landing page — a rating picked inside the mail is the one that
  // actually gets sent.
  const stars = [1, 2, 3, 4, 5]
    .map(
      (score) => `<td style="padding:0 3px;">
                            <a href="${review?.urlForScore(score) ?? "#"}" style="display:block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:10px;background:${score >= 4 ? GOLD : BORDER};color:${score >= 4 ? "#1b1400" : MUTED};text-decoration:none;font-size:19px;font-family:${FONT};">&#9733;</a>
                          </td>`,
    )
    .join("");

  const reviewBlock = review
    ? `<tr>
              <td style="padding:26px 30px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL};border:1px solid ${BORDER};border-radius:14px;">
                  <tr>
                    <td align="center" style="padding:20px 18px;font-family:${FONT};">
                      <div style="font-size:17px;font-weight:800;color:${TEXT};">${escapeHtml(review.question)}</div>
                      <div style="margin-top:5px;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(review.hint)}</div>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:15px auto 0;">
                        <tr>${stars}</tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : "";

  const socialsHtml = SOCIALS.map(
    (social) =>
      `<a href="${social.url}" style="color:${MUTED};text-decoration:none;font-weight:700;">${escapeHtml(social.label)}</a>`,
  ).join(`<span style="color:${BORDER};"> &nbsp;&middot;&nbsp; </span>`);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <!-- Without these, Outlook and Apple Mail "helpfully" invert a dark
         template and land dark grey text on a dark grey card. -->
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
  </head>
  <body style="margin:0;padding:0;background:${BG};-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader ?? intro)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:36px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${CARD};border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">
            <!-- Masthead. The gradient is the brand mark's own; Outlook
                 ignores background-image and keeps the bgcolor underneath,
                 which is why both are set. -->
            <tr>
              <td bgcolor="${ACCENT}" style="background-color:${ACCENT};background-image:linear-gradient(90deg,${CYAN},${ACCENT} 55%,${PURPLE});height:5px;line-height:5px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 30px 0;font-family:${FONT};">
                <div style="font-size:26px;font-weight:900;letter-spacing:-.02em;color:${TEXT};">
                  TeamLink<span style="color:${CYAN};">.GG</span>
                </div>
                <div style="margin-top:5px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${FAINT};">
                  Find your next teammate
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="border-top:1px solid ${BORDER};font-size:0;line-height:0;">&nbsp;</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px 0;font-family:${FONT};">
                <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;color:${TEXT};">${escapeHtml(heading)}</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:${MUTED};">${escapeHtml(intro)}</p>
              </td>
            </tr>
            ${highlightBlock}
            ${rowsBlock}
            <tr>
              <td style="padding:26px 30px 0;">
                <!-- Table button, not a styled <a>: Outlook drops the padding
                     on an anchor and leaves a link-sized tap target. -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" bgcolor="${ACCENT}" style="border-radius:12px;">
                      <a href="${ctaUrl}" style="display:block;padding:15px 20px;color:#ffffff;text-decoration:none;font-family:${FONT};font-size:15px;font-weight:700;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:${FAINT};font-family:${FONT};word-break:break-all;">${ctaUrl}</p>
              </td>
            </tr>
            ${reviewBlock}
            <tr>
              <td style="padding:24px 30px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
                      Need a hand? Reply to this email, or find us on
                      <a href="${COMPANY.discord}" style="color:${CYAN};text-decoration:none;font-weight:700;">Discord</a>
                      &mdash; someone is usually around.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 30px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-top:1px solid ${BORDER};padding-top:16px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
                      ${escapeHtml(footnote)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Below the card: who sent this, and how to stop it. -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
            <tr>
              <td align="center" style="padding:18px 20px 0;font-family:${FONT};font-size:12px;">
                ${socialsHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 20px 0;font-family:${FONT};font-size:11px;line-height:1.7;color:${FAINT};">
                ${escapeHtml(COMPANY.legalName)} &middot; ${escapeHtml(COMPANY.address)}<br>
                <a href="${COMPANY.site}" style="color:${FAINT};text-decoration:none;">gaming.lolboost.gg</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:${COMPANY.support}" style="color:${FAINT};text-decoration:none;">${COMPANY.support}</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 20px 0;font-family:${FONT};font-size:11px;line-height:1.6;color:${FAINT};">
                You&rsquo;re getting this because of an order you placed. Manage what we send you in your
                <a href="${COMPANY.site}/dashboard" style="color:${FAINT};text-decoration:underline;">notification settings</a>.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 20px 0;font-family:${FONT};font-size:11px;color:${FAINT};">
                Not affiliated with Riot Games, Epic Games, or any game publisher.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function shellText({ heading, intro, rows, ctaLabel, ctaUrl, footnote, highlight, review }: Shell): string {
  const all = highlight ? [highlight, ...rows] : rows;
  const lines = all.map((row) => `${row.label}: ${row.value}`).join("\n");
  const rating = review ? `${review.question}\n${review.urlForScore(5)}` : "";
  // Blank sections would otherwise leave a run of empty lines the plain-text
  // part gets judged on.
  return [
    heading,
    intro,
    lines,
    `${ctaLabel}: ${ctaUrl}`,
    rating,
    footnote,
    `${COMPANY.legalName} · ${COMPANY.address}`,
  ]
    .filter((part) => part.trim() !== "")
    .join("\n\n");
}

export interface MailBody {
  subject: string;
  html: string;
  text: string;
}

export function orderConfirmationMail(input: {
  name: string | null;
  orderNo: number;
  gameName: string;
  option: string;
  priceEUR: number;
  url: string;
}): MailBody {
  const content: Shell = {
    heading: "We're finding your teammate",
    intro: input.name
      ? `Thanks ${input.name} — your order is paid and out to the roster right now.`
      : "Your order is paid and out to the roster right now.",
    preheader: `${input.gameName} · ${input.option} — follow your order and keep the link.`,
    highlight: { label: "Order", value: `#${input.orderNo}` },
    rows: [
      { label: "Game", value: input.gameName },
      { label: "Mode", value: input.option },
      { label: "Paid", value: money(input.priceEUR) },
    ],
    ctaLabel: "Follow your order",
    ctaUrl: input.url,
    // The whole point of mailing the link: a guest has no account to log back
    // into, so this mail is their way back to the order.
    footnote:
      "Keep this link — it's how you get back to your order if you close the tab. It stays valid for as long as the session runs.",
  };

  return {
    subject: `Order #${input.orderNo} — finding your teammate`,
    html: shell(content),
    text: shellText(content),
  };
}

/**
 * The end of an order, and the one moment a review is worth asking for.
 *
 * Asked here rather than a day later on purpose: the session just ended, the
 * customer still remembers how it went, and the rating is one click away
 * inside the mail instead of a landing page that asks them to decide twice.
 */
export function orderCompletedMail(input: {
  name: string | null;
  orderNo: number;
  gameName: string;
  option: string;
  teammateName: string | null;
  gamesPlayed: number;
  url: string;
}): MailBody {
  const content: Shell = {
    heading: "GG — your session is complete",
    intro: input.teammateName
      ? `${input.teammateName} has wrapped up your ${input.gameName} session. Thanks for playing with us.`
      : `Your ${input.gameName} session is wrapped up. Thanks for playing with us.`,
    preheader: `${input.gameName} · ${input.option} — how did it go?`,
    highlight: input.teammateName
      ? { label: "Your teammate", value: input.teammateName }
      : { label: "Order", value: `#${input.orderNo}` },
    rows: [
      { label: "Order", value: `#${input.orderNo}` },
      { label: "Game", value: input.gameName },
      { label: "Mode", value: input.option },
      { label: "Games played", value: String(input.gamesPlayed) },
    ],
    review: {
      question: "How did we do?",
      hint: "One tap. It decides who gets sent your way next time.",
      urlForScore: (score) => `${input.url}?rate=${score}`,
    },
    ctaLabel: "Open your session",
    ctaUrl: input.url,
    footnote:
      "Want the same teammate again? Open the session and hit Keep playing — they get first refusal on it.",
  };

  return {
    subject: `Order #${input.orderNo} — session complete`,
    html: shell(content),
    text: shellText(content),
  };
}

/**
 * The generic body for anything routed through the notification channels (see
 * notify/channels.ts) — payouts, fines, cancellations. Those carry their own
 * wording already, so this only frames it.
 */
export function plainNoticeMail(input: {
  name: string | null;
  heading: string;
  body: string;
  url: string;
}): MailBody {
  const content: Shell = {
    heading: input.heading,
    intro: input.body,
    rows: [],
    ctaLabel: "Open TeamLink",
    ctaUrl: input.url,
    footnote: input.name
      ? `Sent to ${input.name} because it affects your account. You can turn these off in your notification settings.`
      : "You can turn these off in your notification settings.",
  };

  return { subject: input.heading, html: shell(content), text: shellText(content) };
}

export function teammateAssignedMail(input: {
  orderNo: number;
  gameName: string;
  teammateNames: string[];
  url: string;
}): MailBody {
  const names = input.teammateNames.join(", ");
  const content: Shell = {
    heading: input.teammateNames.length === 1 ? "Your teammate is ready" : "Your team is ready",
    intro: `${names} ${input.teammateNames.length === 1 ? "is" : "are"} on your ${input.gameName} session. Head back in to say hi and get started.`,
    preheader: `${names} joined your ${input.gameName} session.`,
    highlight: { label: input.teammateNames.length === 1 ? "Teammate" : "Teammates", value: names },
    rows: [
      { label: "Order", value: `#${input.orderNo}` },
      { label: "Game", value: input.gameName },
    ],
    ctaLabel: "Open your session",
    ctaUrl: input.url,
    footnote: "Chat and session details are on that page.",
  };

  return {
    subject: `Order #${input.orderNo} — ${names} joined`,
    html: shell(content),
    text: shellText(content),
  };
}
