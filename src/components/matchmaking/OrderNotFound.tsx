import Link from "next/link";
import { COMPANY, supportMailto } from "@/lib/company";

/**
 * The dead end you reach with a link to an order that isn't there.
 *
 * It used to be one grey sentence in the middle of an empty page, which
 * reads like a crash rather than an answer. The people who land here are
 * mostly guests following a link out of their confirmation mail — no account
 * to sign into, no order list to fall back on — so the page has to say what
 * probably went wrong and give them somewhere to go.
 */
export function OrderNotFound({ subject = "order" }: { subject?: "order" | "session" }) {
  return (
    <div className="lost-card">
      <span className="lost-card__mark" aria-hidden="true">
        <i className="fa-solid fa-compass" />
      </span>

      <h1 className="lost-card__title">We couldn&rsquo;t find that {subject}</h1>
      <p className="lost-card__body">
        The link may be incomplete, or the {subject} may have been cancelled. Nothing is lost — if you were charged,
        the {subject} still exists on our side.
      </p>

      <div className="lost-card__hints">
        <div className="lost-card__hint">
          <i className="fa-solid fa-envelope" aria-hidden="true" />
          <span>
            Check your confirmation email — the link in it is the one that always works, even without an account.
          </span>
        </div>
        <div className="lost-card__hint">
          <i className="fa-solid fa-headset" aria-hidden="true" />
          <span>
            {/* This used to point at /contact, a page that does not exist —
                a dead end offered to the one visitor who is already lost and,
                being a guest, has no account to fall back on. */}
            Still stuck? Email <a href={supportMailto(`Missing ${subject}`)}>{COMPANY.support}</a> with your{" "}
            {subject} number and we&rsquo;ll sort it out.
          </span>
        </div>
      </div>

      <div className="lost-card__actions">
        <Link href="/" className="btn btn--vivid">
          Back to QUP.gg
        </Link>
        <Link href="/games" className="btn btn--ghost">
          Browse games
        </Link>
      </div>
    </div>
  );
}
