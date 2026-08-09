import { COMPANY } from "@/lib/company";

/**
 * The three legal documents, as data rather than three near-identical pages.
 *
 * They share a shape (intro + numbered sections, each prose or a list) so one
 * renderer at /legal/[doc] covers all of them and a new document is an entry
 * here, not another route. Anything that names the company or the support
 * address reads it from lib/company.ts — a policy that points at the wrong
 * address is worse than no policy.
 *
 * Written for what this platform actually does: paid company for a game,
 * never account access. They describe the product honestly, which is the part
 * that matters legally; have a solicitor read them before anything with real
 * money at stake depends on the wording.
 */

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  /** Short line under the title, and the page's meta description. */
  description: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
}

const UPDATED = "9 August 2026";

const TERMS: LegalDoc = {
  slug: "terms",
  title: "Terms of Service",
  description: "The agreement between you and QUP.gg when you book or provide a session.",
  updated: UPDATED,
  intro: [
    `These terms are the agreement between you and ${COMPANY.legalName}, trading as QUP.gg, registered at ${COMPANY.address}. By creating an account, booking a session, or playing as a teammate, you accept them.`,
    "They are written to be read. Where a clause limits what you can expect from us, it says so in plain words rather than hiding behind length.",
  ],
  sections: [
    {
      heading: "1. What QUP.gg is",
      paragraphs: [
        "QUP.gg is a marketplace. You book time with a verified player — a teammate — who joins your lobby and plays with you, coaches you, or simply keeps you company for a session. We match the two of you, hold the payment, and handle support.",
        "We are not a boosting service. A teammate never logs into your account, never asks for your password, and never plays on your behalf while you are away from the keyboard. Any offer to do so is a breach of these terms by whoever made it, and we want to hear about it.",
      ],
    },
    {
      heading: "2. Your account",
      paragraphs: [
        "You need an account to book. Keep your login details to yourself — anything done through your account is treated as done by you.",
        "You must be 18 or older to pay for a session. If you are under 18, you may only use QUP.gg with the involvement of a parent or guardian who accepts these terms on your behalf.",
        "The details you give us have to be accurate. An in-game name that is not yours means the teammate cannot find you, and that is not a fault we can refund.",
      ],
    },
    {
      heading: "3. Booking a session",
      paragraphs: [
        "A booking is an offer to buy the session you selected — the game, the mode, the number of teammates, and the duration or game count shown at checkout. It becomes a contract when we confirm the order.",
        "We match you with an available teammate, usually within a couple of minutes. If nobody accepts, the order is cancelled and you are not charged; where payment has already been taken, it is refunded in full.",
        "You can ask for a different teammate before the session starts, and during it if something is wrong. See the Refund Policy for what happens to the money in each case.",
      ],
    },
    {
      heading: "4. What a session includes",
      paragraphs: [
        "You are buying a teammate's time and effort, not a result. Nobody can promise a win, a rank, or a specific outcome in a competitive game, and we do not.",
        "Coaching sessions include the teammate's attention and feedback for the booked duration. Sessions run on the clock shown at checkout and start when both of you are in the lobby.",
      ],
    },
    {
      heading: "5. Prices, payment and credit",
      paragraphs: [
        "Prices are shown before you pay, in the currency you have selected, and include any applicable tax. The amount displayed at checkout is the amount charged.",
        "We take payment through our payment providers. We never see or store your full card details.",
        "Account credit can be topped up in advance and spent on any session. Credit is not a bank deposit, does not earn interest, and is not transferable between accounts. Credit bought with money can be paid back out to you under the Refund Policy; promotional credit cannot.",
      ],
    },
    {
      heading: "6. How to behave",
      paragraphs: ["A session has two people in it. The rules are the ones you would expect."],
      list: [
        "No harassment, hate speech, threats, or sexual pressure — towards a teammate or a customer.",
        "No asking for account credentials, and no offering them. Both end the session and the account.",
        "No arranging payment outside the platform. It removes every protection either side has.",
        "No recording or streaming a session without the other person's agreement.",
        "No using QUP.gg to break a game publisher's own rules.",
      ],
    },
    {
      heading: "7. Teammates",
      paragraphs: [
        "Teammates are independent contractors, not our employees. They choose when they are available and which orders to take, and they are responsible for their own taxes.",
        "Being listed is not a permanent right. We can pause or remove a teammate for conduct, for repeated no-shows, or for consistently poor reviews, and we withhold earnings for sessions that were never delivered.",
        "Teammates verify their identity before their first payout. That check exists to keep minors and impostors out of paid sessions.",
      ],
    },
    {
      heading: "8. Game publishers",
      paragraphs: [
        "QUP.gg is not affiliated with, endorsed by, or sponsored by Riot Games, Epic Games, Valve, Activision, Mojang, Supercell, Blizzard, Psyonix, or any other publisher. All game names and artwork belong to their owners.",
        "Every game you play has its own terms. You remain responsible for following them, and so does your teammate.",
      ],
    },
    {
      heading: "9. Suspension and closing an account",
      paragraphs: [
        "You can close your account at any time by writing to us. Unspent credit that you paid for is returned; sessions already delivered are not refunded on closure.",
        "We can suspend or close an account that breaks these terms, that we reasonably believe is being used fraudulently, or that we are required to act on by law. Where it is safe and lawful to do so, we say why.",
      ],
    },
    {
      heading: "10. Our responsibility to you",
      paragraphs: [
        "We provide the platform with reasonable care and skill. We do not promise that it is always available or free of faults, and we are not responsible for the game servers, your internet connection, or a publisher's own decisions about your game account.",
        "Where we are liable to you, our liability is limited to the amount you paid for the session the claim relates to. Nothing here limits liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot be limited by law.",
        "None of this affects your statutory rights as a consumer.",
      ],
    },
    {
      heading: "11. Changes",
      paragraphs: [
        "We may update these terms — a new payment method, a new kind of session, a change in the law. The date at the top always reflects the current version, and material changes are announced in the app before they take effect. Continuing to use QUP.gg after that means you accept the new version.",
      ],
    },
    {
      heading: "12. Law and disputes",
      paragraphs: [
        "These terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction. If you live elsewhere in the UK or in the EU, you keep the protection of the mandatory consumer law of the country you live in.",
        `Talk to us first — most disputes are a misunderstanding about one order and are resolved the same day. Write to ${COMPANY.support}.`,
      ],
    },
  ],
};

const PRIVACY: LegalDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  description: "What QUP.gg collects, why, how long we keep it, and the rights you have over it.",
  updated: UPDATED,
  intro: [
    `${COMPANY.legalName}, trading as QUP.gg, is the data controller for the personal data described here. Our registered address is ${COMPANY.address}.`,
    "We collect what a booking needs and very little else. We do not sell personal data, and we do not run advertising trackers on this site.",
  ],
  sections: [
    {
      heading: "1. What we collect",
      list: [
        "Account data — the name you choose, your email address, your password (stored only as a hash), and your country and language settings.",
        "Discord data, if you link it — your Discord ID, username and avatar, so a teammate can reach you where you already are.",
        "Game data — the in-game names and ranks you enter, and the games and modes you book.",
        "Order data — what you booked, when, what it cost, what happened during the session, and any review you leave.",
        "Messages — the chat between you and your teammate, and with support.",
        "Payment data — the last four digits and card type, the payment reference, and whether it succeeded. Full card numbers go straight to our payment provider and never reach our servers.",
        "Teammate verification data — identity documents and payout details, for people who apply to earn money on the platform.",
        "Technical data — IP address, device and browser, and the pages you opened, used for security and to keep the service working.",
      ],
    },
    {
      heading: "2. Why we use it, and on what basis",
      list: [
        "To perform our contract with you: creating your account, matching you with a teammate, running the session, taking payment, and giving support.",
        "For our legitimate interests: preventing fraud and abuse, keeping the platform secure, understanding which parts of the product are used, and improving it.",
        "To meet legal obligations: tax and accounting records, and the identity checks we run before paying a teammate.",
        "With your consent: optional emails about offers. You can withdraw consent at any time, and every such email has an unsubscribe link.",
      ],
    },
    {
      heading: "3. Who we share it with",
      paragraphs: [
        "Only the parties a booking actually needs, and only what each of them needs:",
      ],
      list: [
        "Your teammate sees your display name, the in-game name required to join you, and the chat for that order. They never see your email address or payment details.",
        "Payment providers, to take payment and issue refunds.",
        "Hosting, database and email providers, who process data on our instructions.",
        "Discord, where you have linked your account or we deliver a notification there.",
        "Authorities, where the law requires it.",
      ],
    },
    {
      heading: "4. Where your data is held",
      paragraphs: [
        "Our systems are hosted in the European Union and the United Kingdom. Where a provider processes data outside those areas, the transfer is covered by an adequacy decision or by standard contractual clauses.",
      ],
    },
    {
      heading: "5. How long we keep it",
      list: [
        "Account data: while your account exists, and for 30 days after you close it.",
        "Order and payment records: six years, because tax law requires it.",
        "Session chat: 12 months after the order finishes, then deleted.",
        "Identity verification documents: for as long as the teammate is active, and 12 months after their last payout.",
        "Technical and security logs: 90 days.",
      ],
    },
    {
      heading: "6. Your rights",
      paragraphs: [
        "You can ask us for a copy of your data, ask us to correct it, ask us to delete it, ask us to restrict or stop a particular use, and ask for it in a portable format. Where we rely on legitimate interests, you can object.",
        `Write to ${COMPANY.support} and we will answer within one month. If you are not happy with the answer, you can complain to the UK Information Commissioner's Office, or to the supervisory authority where you live.`,
      ],
    },
    {
      heading: "7. Cookies",
      paragraphs: [
        "We use cookies and local storage that the site needs to function: keeping you signed in, remembering your currency, language and last game, and protecting forms against abuse. There are no advertising or cross-site tracking cookies on QUP.gg.",
      ],
    },
    {
      heading: "8. Children",
      paragraphs: [
        "QUP.gg is not intended for children under 16, and only adults can pay for a session. If you believe a child has given us personal data, tell us and we will delete it.",
      ],
    },
    {
      heading: "9. Changes",
      paragraphs: [
        "If this policy changes in a way that affects you, we will say so in the app before the change takes effect. The date at the top is always the current version.",
      ],
    },
  ],
};

const REFUNDS: LegalDoc = {
  slug: "refunds",
  title: "Refund Policy",
  description: "When you get your money back, how much, and how quickly.",
  updated: UPDATED,
  intro: [
    "The short version: if the session did not happen, you get your money back. If it happened and something went wrong, tell us and we will look at it.",
    "This policy sits alongside your statutory rights as a consumer — it never takes anything away from them.",
  ],
  sections: [
    {
      heading: "1. Before a teammate is matched",
      paragraphs: [
        "Cancel any time before a teammate accepts and you are refunded in full, automatically. If nobody accepts your order at all, we cancel it ourselves and refund it — you never have to chase that.",
      ],
    },
    {
      heading: "2. Matched, but the session has not started",
      paragraphs: [
        "Cancel more than 15 minutes before the agreed start and you get a full refund. Inside 15 minutes, your teammate has already turned down other work to hold the slot, so we refund 50% — or the full amount as account credit, if you would rather keep it on the platform.",
      ],
    },
    {
      heading: "3. Your teammate does not show up",
      paragraphs: [
        "Full refund, and the teammate is not paid. If it happens more than once to the same teammate they stop getting orders.",
      ],
    },
    {
      heading: "4. The session ends early",
      list: [
        "The teammate leaves or stops responding: you are refunded for the part you did not get, pro rata, rounded in your favour.",
        "You leave: the time played is charged, the rest is refunded as credit.",
        "Game servers or a publisher outage make it impossible to play: full refund, no argument. That is nobody's fault.",
      ],
    },
    {
      heading: "5. The session happened but was not good",
      paragraphs: [
        "Open a ticket within 72 hours of the session ending and tell us what went wrong. We read the order chat and both sides of the story. Depending on what we find, that is a full refund, a partial refund, or credit towards a session with somebody else.",
        "A loss is not grounds for a refund. Nobody can guarantee a result in a competitive game, and we do not claim to.",
      ],
    },
    {
      heading: "6. Where the money goes",
      paragraphs: [
        "Refunds go back to the payment method you used, unless you ask for credit instead. Credit lands immediately and can be spent on anything; a card refund is issued the same working day and usually appears within 5–10 days, depending on your bank.",
        "Promotional credit and coupon discounts are not refundable in money — a refund of a discounted order returns what you actually paid.",
      ],
    },
    {
      heading: "7. Topped-up credit",
      paragraphs: [
        "Unspent credit that you paid for can be paid back to your original payment method at any time. Ask us and we will process it.",
      ],
    },
    {
      heading: "8. Chargebacks",
      paragraphs: [
        `Please talk to us before raising a chargeback. A bank dispute freezes the order for weeks and, in almost every case, we would simply have refunded you. Write to ${COMPANY.support} — most refunds are settled within a few hours.`,
      ],
    },
    {
      heading: "9. How to ask",
      paragraphs: [
        `Open the order in your dashboard and use the support chat, or email ${COMPANY.support} with your order number. Tell us what happened; you do not need to argue a case.`,
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  terms: TERMS,
  privacy: PRIVACY,
  refunds: REFUNDS,
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS);

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS[slug];
}
