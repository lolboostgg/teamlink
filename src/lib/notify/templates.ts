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
 */

const BG = "#060811";
const CARD = "#0d1120";
const PANEL = "#131829";
const BORDER = "#232838";
const TEXT = "#f3f4f8";
const MUTED = "#9a9db0";
const FAINT = "#6c6f80";
const ACCENT = "#4066ff";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif";

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
}

function shell({ heading, intro, rows, ctaLabel, ctaUrl, footnote, highlight, preheader }: Shell): string {
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
              <td style="padding:4px 30px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${FONT};">
                  ${rowsHtml}
                </table>
              </td>
            </tr>`
    : "";

  const highlightBlock = highlight
    ? `<tr>
              <td style="padding:22px 30px 0;">
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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARD};border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">
            <!-- Accent band: the one piece of brand colour that survives every
                 client, since it is a background and not an image. -->
            <tr><td style="height:4px;background:${ACCENT};line-height:4px;font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:30px 30px 0;font-family:${FONT};">
                <div style="font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:${ACCENT};">TeamLink</div>
                <h1 style="margin:14px 0 0;font-size:24px;line-height:1.25;font-weight:800;color:${TEXT};">${escapeHtml(heading)}</h1>
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
            <tr>
              <td style="padding:22px 30px 28px;">
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
          <p style="margin:18px 0 0;font-family:${FONT};font-size:11px;line-height:1.5;color:${FAINT};">
            TeamLink &middot; sent by lolboost.gg
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function shellText({ heading, intro, rows, ctaLabel, ctaUrl, footnote, highlight }: Shell): string {
  const all = highlight ? [highlight, ...rows] : rows;
  const lines = all.map((row) => `${row.label}: ${row.value}`).join("\n");
  // Blank sections would otherwise leave a run of empty lines the plain-text
  // part gets judged on.
  return [heading, intro, lines, `${ctaLabel}: ${ctaUrl}`, footnote, "TeamLink"]
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
