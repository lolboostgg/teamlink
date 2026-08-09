import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { ApplyWizardProvider, ApplyButton } from "@/app/(marketing)/become-a-teammate/ApplyWizard";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = {
  title: "Become a Teammate",
  description: "Get paid to play the games you already play. Apply to take QUP.gg sessions.",
};

const REASONS = [
  {
    icon: "fa-solid fa-sack-dollar",
    color: "var(--hue-green)",
    title: "The rate you accept is the rate you get",
    body: "No platform cut taken off the back end and no surprise deductions. You see the payout on the order before you take it.",
  },
  {
    icon: "fa-solid fa-clock",
    color: "var(--hue-cyan)",
    title: "You choose when",
    body: "Go available when you sit down to play, go offline when you are done. There is no schedule to sign up for and no penalty for a quiet week.",
  },
  {
    icon: "fa-solid fa-scale-balanced",
    color: "var(--hue-gold)",
    title: "Orders are shared out fairly",
    body: "Dispatch ranks by who last got work, not by who clicks fastest — so a good session is what wins you the next one.",
  },
  {
    icon: "fa-solid fa-shield-halved",
    color: "var(--hue-purple)",
    title: "Backed when it goes wrong",
    body: "A customer who no-shows or turns abusive is our problem, not yours. Report it and you still get paid for the time you held.",
  },
];

const STEPS = [
  { step: "01", title: "Apply", text: "Two minutes of form below. Games, ranks, and when you are usually online." },
  { step: "02", title: "We review", text: "Usually two to three days. We check your ranks and read what you wrote." },
  { step: "03", title: "Invite link", text: "A fit gets an emailed invite link. That link is what creates your teammate account." },
  { step: "04", title: "Set up your profile", text: "Avatar, languages, timezone, and a profile for each game you take orders in." },
  { step: "05", title: "Verify once", text: "An ID check before your first payout — it is what keeps minors and impostors off paid sessions." },
  { step: "06", title: "Go available", text: "Flip the switch and the dispatch starts sending you orders." },
];

const REQUIREMENTS = [
  "18 or older, with ID you can verify.",
  "A rank that is genuinely above the players who book you, in at least one game we list.",
  "Discord, and a microphone people can understand you through.",
  "A stable connection and a machine that holds a frame rate.",
  "Conversational English, or fluency in a language our players book in.",
  "The temperament for it. Reviews decide who keeps getting orders, and toxicity ends an account.",
];

const FAQ = [
  {
    q: "Is this boosting?",
    a: "No. You never receive a customer's login and you never play their account. You join their lobby and play alongside them — anyone who asks you for credentials is breaking our rules, and so is anyone who offers.",
  },
  {
    q: "How and when do I get paid?",
    a: "Completed sessions land in your balance. You request a payout from your dashboard whenever you like, to the method you set up, after the one-time identity check.",
  },
  {
    q: "Do I have to accept every order?",
    a: "No. Declining costs you nothing. Accepting an order you cannot start right away is the thing that hurts — that is a no-show, and repeated no-shows stop the orders.",
  },
  {
    q: "Can I play more than one game?",
    a: `Yes, and it is the single biggest thing you can do for your earnings. We list ${GAMES.length} games and most teammates take orders in two or three.`,
  },
  {
    q: "What if a customer is abusive?",
    a: "End the session and report it in the order chat. You are paid for the time you held, and we deal with the account.",
  },
];

export default function BecomeATeammatePage() {
  return (
    <ApplyWizardProvider>
      <main className="section">
      <div className="container">
        <PageHero
          eyebrow="Become a teammate"
          title="Get paid for the games you were going to play anyway."
          sub="Go available when you sit down, take the orders that suit you, and get paid per session at the rate you accepted."
        >
          <div className="page-hero__cta">
            <ApplyButton className="btn btn--vivid btn--lg">
              <i className="fa-solid fa-bolt" aria-hidden="true" /> Apply now
            </ApplyButton>
            <Link href="/games" className="btn btn--ghost btn--lg">
              See what people book
            </Link>
          </div>
        </PageHero>

        <Reveal>
          <div className="value-grid">
            {REASONS.map((reason) => (
              <div className="value-card" key={reason.title}>
                <span className="value-card__icon" style={{ ["--item-color" as string]: reason.color }}>
                  <i className={reason.icon} aria-hidden="true" />
                </span>
                <h3>{reason.title}</h3>
                <p>{reason.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <section className="about-block">
            <h2 className="about-block__title">How it goes</h2>
            <ol className="step-grid">
              {STEPS.map((step) => (
                <li className="step-grid__item" key={step.step}>
                  <span className="step-grid__num">{step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>

        <Reveal>
          <section className="about-block">
            <h2 className="about-block__title">What we need from you</h2>
            <ul className="check-list">
              {REQUIREMENTS.map((item) => (
                <li key={item}>
                  <i className="fa-solid fa-circle-check" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal>
          <section className="about-block" id="apply">
            <h2 className="about-block__title">Apply</h2>
            <div className="apply-invite">
              <div className="apply-invite__glow" aria-hidden="true" />
              <div className="apply-invite__body">
                <h3>Four short steps, about two minutes.</h3>
                <p>
                  Who you are, the games you play, when you are around. Everything goes straight to the team — nothing
                  is public, and we do not pass it on.
                </p>
                <ApplyButton className="btn btn--vivid btn--lg">
                  <i className="fa-solid fa-bolt" aria-hidden="true" /> Start your application
                </ApplyButton>
              </div>
              <ol className="apply-invite__steps" aria-hidden="true">
                <li>
                  <span>1</span> About you
                </li>
                <li>
                  <span>2</span> Your games
                </li>
                <li>
                  <span>3</span> Availability
                </li>
                <li>
                  <span>4</span> Review
                </li>
              </ol>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="about-block">
            <h2 className="about-block__title">Questions</h2>
            <div className="qa-list">
              {FAQ.map((item) => (
                <div className="qa-item" key={item.q}>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>
      </main>
    </ApplyWizardProvider>
  );
}
