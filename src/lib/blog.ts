/**
 * The blog, as data.
 *
 * No CMS and no MDX pipeline for four posts — a typed array renders both the
 * index and /blog/[slug], and adding a post is one entry. If this ever grows
 * past a couple of dozen, that is the moment to move it to files on disk, not
 * before.
 *
 * Posts are ordered newest first; the index and generateStaticParams both
 * read that order rather than sorting it again.
 */

export interface PostSection {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
}

export interface Post {
  slug: string;
  title: string;
  /** One sentence, used on the card and as the page's meta description. */
  excerpt: string;
  /** ISO date — formatted at render so the list and the post agree. */
  date: string;
  readMinutes: number;
  tag: "Product" | "Guides" | "Teammates" | "Behind the scenes";
  body: PostSection[];
}

export const POSTS: Post[] = [
  {
    slug: "what-two-minutes-actually-means",
    title: "What “matched in under two minutes” actually means",
    excerpt:
      "The number on the homepage is a promise about dispatch, not a marketing round-up. Here is the machinery behind it.",
    date: "2026-08-04",
    readMinutes: 5,
    tag: "Behind the scenes",
    body: [
      {
        paragraphs: [
          "Every marketplace claims to be fast. Most of them mean “fast once somebody notices your request”. We wanted a number we could defend, so we built the dispatch around it and then measured what came out.",
        ],
      },
      {
        heading: "Orders go out in waves, not to everybody",
        paragraphs: [
          "The obvious design is to ping every available teammate at once and let them race. It is also the worst one: the fastest clicker wins every order, the rest learn that answering is pointless, and within a week you have three active teammates and a long tail of people who stopped opening the app.",
          "Instead an order goes to a small first wave — the teammates who fit the game and mode, ranked by how recently they last got work rather than by who is quickest on the mouse. If nobody takes it within the wave's window, the next wave gets it, wider than the last. Most orders never leave the first wave.",
        ],
      },
      {
        heading: "The clock is visible on both sides",
        paragraphs: [
          "A teammate sees exactly how long they have to accept, and the customer sees the search running. Neither side is left guessing, and an order that is genuinely going to fail is visible as failing long before it times out — which is when a human can step in.",
        ],
      },
      {
        heading: "What we do when it does not work",
        paragraphs: [
          "Sometimes there is nobody online for a game at four in the morning. The order cancels itself and refunds in full rather than sitting in a queue overnight. We would rather lose the order than hold your money for a session that was never going to happen.",
        ],
      },
    ],
  },
  {
    slug: "duo-queue-without-tilting",
    title: "How to duo queue with a stranger without tilting either of you",
    excerpt:
      "Four habits that separate the sessions people rebook from the ones that quietly end after one game.",
    date: "2026-07-22",
    readMinutes: 6,
    tag: "Guides",
    body: [
      {
        paragraphs: [
          "We see a lot of sessions. The ones that go well are rarely the ones with the highest-ranked teammate — they are the ones where the two people agreed on what the session was for in the first three minutes.",
        ],
      },
      {
        heading: "Say what you want before champion select",
        paragraphs: [
          "“I want to climb” and “I want to have fun for an hour” lead to completely different games. Both are valid. Saying which one you are here for costs ten seconds and prevents the whole session from being a slow negotiation.",
        ],
      },
      {
        heading: "Pick lanes and roles up front",
        paragraphs: [
          "Deciding who plays what after the queue pops is how you end up with two junglers and a bad mood. Sort it while you are still in the lobby.",
        ],
      },
      {
        heading: "Call your own mistakes first",
        paragraphs: [
          "The fastest way to keep a session civil is to be the first person to say “that was on me”. It sets the tone, and it makes the feedback that comes back at you land as information rather than blame.",
        ],
      },
      {
        heading: "Stop at the right time",
        paragraphs: [
          "Two losses in a row is a break, not a reason to queue harder. The best teammates say so out loud instead of grinding a customer into a worse mood than they arrived in.",
        ],
      },
    ],
  },
  {
    slug: "why-we-never-ask-for-your-account",
    title: "Why we will never ask for your account",
    excerpt:
      "Account sharing is the norm in this industry. It is also the single biggest risk to the person buying — so we built the product without it.",
    date: "2026-07-08",
    readMinutes: 4,
    tag: "Product",
    body: [
      {
        paragraphs: [
          "Most services in this space work by taking your login. You hand over your account, someone else plays it, you get it back with a higher rank. It is quick, it is effective, and it puts everything you own at risk.",
        ],
      },
      {
        heading: "What you are actually handing over",
        list: [
          "Every purchase on that account, and often the payment method behind it.",
          "The account's recovery email, if it is reused anywhere else — which it usually is.",
          "A login from a device and country that is not yours, which is exactly what a publisher's fraud system is built to catch.",
          "Any grounds you had to appeal a ban, because you gave the access away voluntarily.",
        ],
      },
      {
        heading: "The version that does not need any of that",
        paragraphs: [
          "You stay signed in on your own account. Your teammate joins the lobby the way any friend would. You are in every game you paid for, which also means you learn something from them.",
          "It is slower than boosting. It is also the only version of this product where the worst case is a bad hour rather than a lost account.",
        ],
      },
      {
        heading: "If anyone asks anyway",
        paragraphs: [
          "A teammate who asks for your credentials is breaking our terms, and the session ends there. Report it in the order chat — we read every one of those reports.",
        ],
      },
    ],
  },
  {
    slug: "what-teammates-actually-earn",
    title: "What teammates actually earn on QUP.gg",
    excerpt:
      "Real numbers on rates, payouts and what separates the people booked every night from the ones who get one order a week.",
    date: "2026-06-19",
    readMinutes: 5,
    tag: "Teammates",
    body: [
      {
        paragraphs: [
          "People ask what this pays before they ask anything else, and fair enough. Here is the honest shape of it.",
        ],
      },
      {
        heading: "How pay works",
        paragraphs: [
          "You are paid per session, at the rate shown when you accept the order. Nothing is deducted afterwards for platform fees — the number you accept is the number that lands in your balance when the session is confirmed complete.",
          "Payouts are requested from your dashboard and paid to the method you set up. Identity verification happens once, before the first one.",
        ],
      },
      {
        heading: "What actually drives earnings",
        list: [
          "Availability at the hours people book — evenings and weekends in European and North American time zones.",
          "Accepting fast. Orders move to the next wave quickly, and the dispatch remembers who answers.",
          "Reviews. A steady five-star record puts you in the first wave more often than a high rank does.",
          "Breadth. Two or three games you can genuinely play beats one you are excellent at.",
        ],
      },
      {
        heading: "What it is not",
        paragraphs: [
          "It is not a salary and it is not passive. Nobody earns anything on a night they are not online. Treated as a few good hours on the evenings you were going to play anyway, it works well; treated as a full-time income from day one, it will disappoint you.",
        ],
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** One formatter, so the card and the post never disagree about a date. */
export function formatPostDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}
