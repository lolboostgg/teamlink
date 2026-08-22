import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing mail over the Hostinger mailbox.
 *
 * Every send is best-effort: a mailbox that is down, misconfigured or simply
 * not set up in this environment must never take an order with it. Callers get
 * a boolean and are expected to ignore it — the order is the thing that
 * matters, the mail is a courtesy on top.
 */

let cached: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransport(): Transporter | null {
  if (!isMailConfigured()) return null;
  if (cached) return cached;

  const port = Number(process.env.SMTP_PORT ?? 587);

  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 opens in the clear and upgrades via STARTTLS.
    // Getting this backwards is the classic "connection hangs then times out"
    // symptom, so it's derived from the port rather than configured twice.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    // The mailbox is shared with the PHP site's sender, which keeps its
    // connection alive; a serverless-ish Next.js process would leak sockets
    // doing the same, so each batch opens and closes its own.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });

  return cached;
}

/** Display name + address the mails come from. */
function from(): string {
  return process.env.SMTP_FROM || `QUP.gg <${process.env.SMTP_USER}>`;
}

interface MailInput {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Spam filters weigh HTML-only mail badly. */
  text: string;
}

export async function sendMail({ to, subject, html, text }: MailInput): Promise<boolean> {
  // getTransport() inside the try, not above it. It calls
  // nodemailer.createTransport, which validates what it is handed and can
  // throw on a bad SMTP_PORT or an option a new major stopped accepting — and
  // this function's whole contract is that it never throws, because a mailbox
  // problem must not take down the write it is reporting on. Above the try
  // that contract was a comment rather than a fact, and the callers that trust
  // it are the ones running inside an order transition.
  try {
    const transport = getTransport();
    if (!transport) {
      console.warn("[mail] not configured — skipping:", subject);
      return false;
    }

    await transport.sendMail({
      from: from(),
      to,
      replyTo: process.env.SMTP_USER,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[mail] send failed:", subject, err);
    return false;
  }
}
