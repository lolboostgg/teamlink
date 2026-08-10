import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/app/(marketing)/contact/ContactForm";
import { COMPANY, supportMailto } from "@/lib/company";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Reach QUP.gg support, our Discord, or the team — and what to expect back.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className="section">
      <div className="container">
        <PageHero
          eyebrow="Contact"
          title="Talk to a person"
          sub="Support is staffed by people who play these games. No bots and no ticket that goes quiet for three days."
        />

        <div className="contact-layout">
          <Reveal className="contact-layout__aside">
            <div className="contact-card">
              <span className="contact-card__icon" style={{ ["--item-color" as string]: "var(--hue-cyan)" }}>
                <i className="fa-solid fa-envelope" aria-hidden="true" />
              </span>
              <h3>Email</h3>
              <p>Best for anything with an order number attached.</p>
              <a href={supportMailto("QUP.gg support")}>{COMPANY.support}</a>
            </div>

            <div className="contact-card">
              <span className="contact-card__icon" style={{ ["--item-color" as string]: "var(--hue-purple)" }}>
                <i className="fa-brands fa-discord" aria-hidden="true" />
              </span>
              <h3>Discord</h3>
              <p>Fastest during European evenings, and where teammates hang out.</p>
              <a href={COMPANY.discord} target="_blank" rel="noreferrer noopener">
                Join the server
              </a>
            </div>

            <div className="contact-card">
              <span className="contact-card__icon" style={{ ["--item-color" as string]: "var(--hue-green)" }}>
                <i className="fa-solid fa-comments" aria-hidden="true" />
              </span>
              <h3>A live session</h3>
              <p>
                If a session is running right now, the chat inside the order is the quickest route — it reaches your
                teammate and us at the same time.
              </p>
              <Link href="/dashboard/client/orders">Open your orders</Link>
            </div>

            {/* Said plainly rather than promised vaguely: "we aim to respond
                as soon as possible" tells nobody whether to wait or chase. */}
            <div className="contact-hours">
              <h4>What to expect</h4>
              <ul>
                <li>
                  <b>Under an hour</b> — 15:00–01:00 CET, every day
                </li>
                <li>
                  <b>By the next morning</b> — anything sent overnight
                </li>
                <li>
                  <b>Same working day</b> — refunds, once we have the order number
                </li>
              </ul>
            </div>

            <p className="contact-legal">
              {COMPANY.legalName}
              <br />
              {COMPANY.address}
            </p>
          </Reveal>

          <Reveal className="contact-layout__main">
            <div className="panel">
              <h2 className="panel__title">Send us a message</h2>
              <p className="panel__sub">No account needed. Everything here goes to the same inbox as the address above.</p>
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
