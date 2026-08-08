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
const BORDER = "#232838";
const TEXT = "#f3f4f8";
const MUTED = "#9a9db0";
const ACCENT = "#4066ff";

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
}

function shell({ heading, intro, rows, ctaLabel, ctaUrl, footnote }: Shell): string {
  const rowsHtml = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:7px 0;color:${MUTED};font-size:14px;">${escapeHtml(row.label)}</td>
          <td style="padding:7px 0;color:${TEXT};font-size:14px;font-weight:700;text-align:right;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${CARD};border:1px solid ${BORDER};border-radius:16px;">
            <tr>
              <td style="padding:28px 28px 0;">
                <div style="font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${ACCENT};">TeamLink</div>
                <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:${TEXT};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(heading)}</h1>
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:${MUTED};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;">
                  ${rowsHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 28px;">
                <a href="${ctaUrl}" style="display:block;background:${ACCENT};color:#ffffff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">${escapeHtml(ctaLabel)}</a>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${MUTED};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(footnote)}</p>
                <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:#6c6f80;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">${ctaUrl}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function shellText({ heading, intro, rows, ctaLabel, ctaUrl, footnote }: Shell): string {
  const lines = rows.map((row) => `${row.label}: ${row.value}`).join("\n");
  return `${heading}\n\n${intro}\n\n${lines}\n\n${ctaLabel}: ${ctaUrl}\n\n${footnote}\n\nTeamLink`;
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
    rows: [
      { label: "Order", value: `#${input.orderNo}` },
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
    rows: [
      { label: "Order", value: `#${input.orderNo}` },
      { label: "Game", value: input.gameName },
      { label: input.teammateNames.length === 1 ? "Teammate" : "Teammates", value: names },
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
