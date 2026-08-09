/**
 * Open roles, as data — same reasoning as lib/blog.ts. A role is an entry
 * here; closing one is a deletion, not a page that quietly keeps ranking.
 *
 * Applications go to the same inbox as everything else (see
 * app/actions/applications.ts) rather than to a hiring tool nobody checks.
 */

export interface Role {
  id: string;
  title: string;
  team: string;
  /** "Remote (Europe)" and so on — where the person can actually sit. */
  location: string;
  commitment: "Full-time" | "Part-time" | "Contract";
  summary: string;
  responsibilities: string[];
  looking: string[];
}

export const ROLES: Role[] = [
  {
    id: "community-moderator",
    title: "Community & Discord Moderator",
    team: "Community",
    location: "Remote (Europe or North America)",
    commitment: "Part-time",
    summary:
      "Keep the Discord a place people want to be in: answer the questions that come in at nine in the evening, defuse the arguments, and tell us what keeps coming up.",
    responsibilities: [
      "Cover a regular evening or weekend shift in the Discord and the in-app support chat.",
      "Handle first-line questions about orders, refunds and matching, and escalate what you cannot resolve.",
      "Write up recurring problems so they get fixed in the product rather than answered forever.",
    ],
    looking: [
      "You have moderated a gaming community before and can point at it.",
      "Fluent English; a second language spoken in our player base is a real advantage.",
      "Even-tempered in an argument at midnight.",
    ],
  },
  {
    id: "teammate-success",
    title: "Teammate Success Lead",
    team: "Operations",
    location: "Remote (Europe)",
    commitment: "Full-time",
    summary:
      "Own the teammate side of the marketplace: who gets onboarded, who gets better, and who should not be taking orders.",
    responsibilities: [
      "Review applications and run the onboarding calls.",
      "Watch quality signals — reviews, no-shows, cancellations — and act on them early.",
      "Build the guidance that turns a good player into a teammate people rebook.",
    ],
    looking: [
      "You have run a supply side before: creators, drivers, freelancers, tutors — the shape is the same.",
      "Comfortable telling somebody their sessions are not good enough, kindly and clearly.",
      "You play, and it shows in how you talk to players.",
    ],
  },
  {
    id: "fullstack-engineer",
    title: "Full-stack Engineer",
    team: "Engineering",
    location: "Remote (Europe)",
    commitment: "Full-time",
    summary:
      "Work across the whole product — the booking flow, the dispatch, the dashboards — in a small team where what you ship is live the same week.",
    responsibilities: [
      "Build features end to end: schema, server actions, UI, the lot.",
      "Keep the dispatch honest — it is the part of the product that has to be both fast and fair.",
      "Carry a share of the on-call for a platform that is busiest when everyone else is off.",
    ],
    looking: [
      "Strong TypeScript, and real experience with React and a modern Next.js app router codebase.",
      "You are comfortable in a relational schema and can reason about a query before you write it.",
      "You have shipped something with payments in it and remember what went wrong.",
    ],
  },
  {
    id: "content-creator",
    title: "Content & Growth (Short-form)",
    team: "Growth",
    location: "Remote (anywhere)",
    commitment: "Contract",
    summary:
      "Make the short-form video that actually gets watched — clips, session moments, and the kind of gaming content our players already follow.",
    responsibilities: [
      "Produce a steady run of short-form video for TikTok, Reels and Shorts.",
      "Work with teammates and customers to turn real sessions into clips worth sharing.",
      "Report on what worked, honestly, and stop making the things that did not.",
    ],
    looking: [
      "A portfolio of short-form that performed, with the numbers to back it.",
      "You edit fast and to a schedule.",
      "You understand the games we list well enough to know what is funny in them.",
    ],
  },
];

export function getRole(id: string): Role | undefined {
  return ROLES.find((r) => r.id === id);
}
