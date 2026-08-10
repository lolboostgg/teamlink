/**
 * The one path from "I want to play" to "somebody joined", in one place.
 *
 * It used to be two. The booking sidebar counted four steps — mode, account
 * details, pay, teammate joins — and the checkout then counted three
 * different ones: your details, in-game info, payment. Same journey, two maps,
 * so "step 2 of 4" on one screen became "step 1 of 3" on the next and nobody
 * could tell how far along they were.
 *
 * Both screens read this list now, which is what makes the numbering mean
 * something: the sidebar shows the whole path with the first step already
 * behind you, and the checkout shows the same path with its position on it.
 */

export type BookingStepKey = "mode" | "details" | "ingame" | "pay" | "match";

export interface BookingStep {
  key: BookingStepKey;
  /** Short form for the checkout rail, where five labels share one line. */
  label: string;
  /** Long form for the sidebar, which has the room for a sentence. */
  title: string;
  sub: string;
}

interface Options {
  /** What the customer picked, for the first step's subtitle. */
  modeSummary?: string;
  /** How long the wait usually is, for the last one. */
  eta?: string;
  /**
   * False once the booking page has already collected the in-game name, which
   * is exactly when the checkout skips that step — see CheckoutForm. The step
   * has to disappear from the count too, or the rail promises a screen that
   * never comes.
   */
  includeIngame?: boolean;
}

export function bookingSteps({ modeSummary, eta, includeIngame = true }: Options = {}): BookingStep[] {
  const steps: BookingStep[] = [
    { key: "mode", label: "Mode", title: "Mode picked", sub: modeSummary ?? "Game and session type" },
    { key: "details", label: "Your details", title: "Your details", sub: "Email or sign in" },
    { key: "ingame", label: "In-game info", title: "In-game info", sub: "IGN, region and role" },
    { key: "pay", label: "Pay", title: "Pay", sub: "Card, PayPal or crypto" },
    { key: "match", label: "Teammate joins", title: "Teammate joins", sub: eta ? `Usually ${eta}` : "Usually under 2 min" },
  ];

  return includeIngame ? steps : steps.filter((step) => step.key !== "ingame");
}
