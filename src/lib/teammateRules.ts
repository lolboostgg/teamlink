export interface RuleGroup {
  title: string;
  icon: string;
  rules: string[];
}

/**
 * What a teammate agrees to by taking orders.
 *
 * Kept in code rather than in the database on purpose: these are the terms
 * payouts can be withheld under, so a change should be a reviewed commit with
 * a date attached, not an edit someone can make at 2am with no trace.
 */
export const TEAMMATE_RULES: RuleGroup[] = [
  {
    title: "Talking to the customer",
    icon: "fa-solid fa-comments",
    rules: [
      "Do not spam ping the customer.",
      "Do not be toxic or derogatory toward anyone in the game — teammates, opponents or the customer.",
      "Do not complete the order without saying anything to the customer after the last game is finished.",
      "Reply within a few minutes while an order is running. If you have to step away, say so first.",
      "Keep it on TeamLink. Asking a customer to pay or book outside the platform ends the account.",
    ],
  },
  {
    title: "Playing the order",
    icon: "fa-solid fa-gamepad",
    rules: [
      "Play the role and the account the order was booked for. Ask before switching either.",
      "If the game is exceptionally short — an FF15 loss from an AFKer, say — offer a makeup game.",
      "Do not intentionally throw, grief, or leave a game you have started.",
      "Do not hand the account or the session to anyone else. The person who accepted the order is the person who plays it.",
      "Do not accept an order you cannot start right away.",
    ],
  },
  {
    title: "Results and proof",
    icon: "fa-solid fa-camera",
    rules: [
      "Do not submit fake results, including screenshots and links.",
      "Submit each game's result as it finishes, not all at once at the end.",
      "Screenshots have to show the actual scoreboard of that game.",
    ],
  },
  {
    title: "Your account",
    icon: "fa-solid fa-shield-halved",
    rules: [
      "The identity you verified with has to be your own.",
      "One account per person. Sharing a login is treated as fraud.",
      "Keep your profile honest — rank, roles and languages are what customers pick you by.",
    ],
  },
];

export const RULES_CONSEQUENCE =
  "Breaking these can cost you the payout for the order in question, and repeated or serious breaches end the account.";
