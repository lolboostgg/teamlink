import { PriceTag } from "@/components/currency/PriceTag";

/**
 * Shown while a cancellation waits on the teammate. Rendered from both
 * MatchmakingScreen and SessionScreen, which each had their own copy of a
 * bare spinner and one line of text — for a screen that asks someone to
 * wait on another person and says nothing about their money.
 */
export function CancelPendingCard({
  teammateName,
  refundEUR,
}: {
  teammateName?: string | null;
  refundEUR?: number | null;
}) {
  const who = teammateName ?? "Your teammate";

  return (
    <div className="cancel-pending">
      <span className="cancel-pending__icon" aria-hidden="true">
        <i className="fa-solid fa-hourglass-half" />
      </span>

      <h1 className="cancel-pending__title">Cancellation requested</h1>
      <p className="cancel-pending__sub">
        {who} has been asked to confirm. This usually takes a moment.
      </p>

      <ol className="cancel-pending__steps">
        <li className="is-done">
          <span className="cancel-pending__step-mark" aria-hidden="true">
            <i className="fa-solid fa-check" />
          </span>
          <span>
            <strong>You asked to cancel</strong>
            <small>The session is paused until this is answered.</small>
          </span>
        </li>
        <li className="is-active">
          <span className="cancel-pending__step-mark" aria-hidden="true" />
          <span>
            <strong>{who} confirms</strong>
            <small>They can also decline, and the session simply carries on.</small>
          </span>
        </li>
        <li>
          <span className="cancel-pending__step-mark" aria-hidden="true" />
          <span>
            <strong>You get your credits back</strong>
            <small>
              {refundEUR != null ? (
                <>
                  <PriceTag amountEUR={refundEUR} /> returns to your balance, ready to rebook.
                </>
              ) : (
                "The full amount returns to your balance, ready to rebook."
              )}
            </small>
          </span>
        </li>
      </ol>

      <p className="cancel-pending__foot">
        <i className="fa-regular fa-circle-question" aria-hidden="true" />
        Nothing further is charged while you wait.
      </p>
    </div>
  );
}
