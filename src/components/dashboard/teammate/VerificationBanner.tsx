import Link from "next/link";

interface Props {
  status: string;
  /** A teammate with no payout method can't be paid even once approved. */
  hasPayoutMethod: boolean;
}

const COPY: Record<string, { tone: string; icon: string; title: string; body: string; cta: string }> = {
  UNSUBMITTED: {
    tone: "warning",
    icon: "fa-solid fa-id-card",
    title: "Verify your identity to get paid",
    body: "Earnings keep accruing, but nothing is released until your documents are approved.",
    cta: "Start verification",
  },
  PENDING: {
    tone: "muted",
    icon: "fa-regular fa-clock",
    title: "Verification is under review",
    body: "We'll let you know as soon as an admin has looked at your documents.",
    cta: "View status",
  },
  REJECTED: {
    tone: "warning",
    icon: "fa-solid fa-circle-exclamation",
    title: "Your verification needs another look",
    body: "Something was off with the documents you submitted. Check the note and re-upload.",
    cta: "Fix verification",
  },
};

/**
 * Sits at the top of the teammate overview whenever something blocks a
 * payout. Renders nothing once the teammate is approved *and* has somewhere
 * for the money to go — an approved teammate with no payout method is just
 * as stuck, and that case had no signal anywhere before.
 */
export function VerificationBanner({ status, hasPayoutMethod }: Props) {
  const blocked = COPY[status];

  if (!blocked && hasPayoutMethod) return null;

  const copy = blocked ?? {
    tone: "warning",
    icon: "fa-solid fa-wallet",
    title: "Add a payout method",
    body: "You're verified, but there's no bank account or wallet on file to send your earnings to.",
    cta: "Add payout method",
  };

  return (
    <div className={`verification-banner verification-banner--${copy.tone}`}>
      <span className="verification-banner__icon">
        <i className={copy.icon} aria-hidden="true" />
      </span>
      <div className="verification-banner__copy">
        <strong>{copy.title}</strong>
        <span>{copy.body}</span>
      </div>
      <Link href="/dashboard/teammate/verification" className="btn btn--vivid btn--sm">
        {copy.cta}
      </Link>
    </div>
  );
}
