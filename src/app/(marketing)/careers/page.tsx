import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { ROLES } from "@/lib/careers";
import { COMPANY, supportMailto } from "@/lib/company";

export const metadata: Metadata = {
  title: "Work with us",
  description: "Open roles at QUP.gg — remote, small team, and most of us started as teammates.",
};

const PERKS = [
  { icon: "fa-solid fa-earth-europe", title: "Remote by default", body: "No office, no relocation. We overlap a few hours a day and otherwise work when we work best." },
  { icon: "fa-solid fa-gamepad", title: "Played, not observed", body: "Everyone here plays the games we list. Product decisions get argued about by people who queue." },
  { icon: "fa-solid fa-bolt", title: "Shipped this week", body: "Small team, short path. What you build is live in days, and you watch real sessions run through it." },
  { icon: "fa-solid fa-arrow-trend-up", title: "Room to grow into", body: "Half the team moved into their role from somewhere else in the company, teammates included." },
];

export default function CareersPage() {
  return (
    <main className="section">
      <div className="container">
        <PageHero
          eyebrow="Careers"
          title="Work with us"
          sub="We are a small remote team building a marketplace that runs hardest in the evenings. If you play, you already understand most of the product."
        />

        <Reveal>
          <div className="value-grid value-grid--compact">
            {PERKS.map((perk) => (
              <div className="value-card" key={perk.title}>
                <span className="value-card__icon">
                  <i className={perk.icon} aria-hidden="true" />
                </span>
                <h3>{perk.title}</h3>
                <p>{perk.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <section className="about-block">
          <h2 className="about-block__title">Open roles</h2>
          <div className="role-list">
            {ROLES.map((role, i) => (
              <Reveal key={role.id} delay={i * 60}>
                <article className="role-card" id={role.id}>
                  <div className="role-card__head">
                    <div>
                      <h3 className="role-card__title">{role.title}</h3>
                      <div className="role-card__tags">
                        <span>{role.team}</span>
                        <span>{role.location}</span>
                        <span>{role.commitment}</span>
                      </div>
                    </div>
                    <a href={supportMailto(`Application: ${role.title}`)} className="btn btn--primary btn--sm">
                      Apply
                    </a>
                  </div>

                  <p className="role-card__summary">{role.summary}</p>

                  <div className="role-card__cols">
                    <div>
                      <h4>What you would do</h4>
                      <ul>
                        {role.responsibilities.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>What we are looking for</h4>
                      <ul>
                        {role.looking.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          {/* The two things people ask after reading the list, answered where
              they are rather than in a mailto nobody sends. */}
          <div className="cta-panel">
            <div>
              <h2>Nothing here fits?</h2>
              <p>
                Send us what you do and why this is the place to do it. We read all of it, and we have written roles
                around people before. <a href={supportMailto("Open application")}>{COMPANY.support}</a>
              </p>
            </div>
            <div>
              <h2>Want to play instead?</h2>
              <p>
                Being a teammate is not a job here — it is paid work you take when you are online anyway, and it is
                where most of this team started.
              </p>
              <Link href="/become-a-teammate" className="btn btn--vivid btn--sm">
                Apply as a teammate
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
