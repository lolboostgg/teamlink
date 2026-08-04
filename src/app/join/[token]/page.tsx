import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { openInvite, inviteState } from "@/lib/teammateInvites";
import { JoinForm } from "@/app/join/[token]/JoinForm";

export const metadata: Metadata = { title: "Join TeamLink" };
export const dynamic = "force-dynamic";

const DEAD_COPY: Record<string, { title: string; body: string }> = {
  used: {
    title: "This invite has already been used",
    body: "Each link creates exactly one account. Ask whoever sent it to you for a fresh one.",
  },
  expired: {
    title: "This invite has expired",
    body: "Invite links are only valid for a limited time. Ask for a new one and you're good to go.",
  },
  revoked: {
    title: "This invite was withdrawn",
    body: "An admin cancelled this link. Get in touch if you think that's a mistake.",
  },
  missing: {
    title: "We don't know this invite",
    body: "The link looks incomplete or was mistyped. Copying it again usually fixes it.",
  },
};

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await openInvite(token);
  const state = invite ? inviteState(invite) : "missing";

  if (!invite || state !== "open") {
    const copy = DEAD_COPY[state] ?? DEAD_COPY.missing;
    return (
      <main className="join-screen">
        <div className="join-card join-card--dead">
          <Logo withWordmark />
          <span className="join-card__icon join-card__icon--dead">
            <i className="fa-solid fa-link-slash" aria-hidden="true" />
          </span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          <Link href="/" className="btn btn--ghost btn--sm">
            Back to TeamLink
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="join-screen">
      <div className="join-card">
        <Logo withWordmark />
        <span className="join-card__icon">
          <i className="fa-solid fa-user-plus" aria-hidden="true" />
        </span>
        <h1>Create your teammate account</h1>
        <p>
          You&rsquo;ve been invited to join the TeamLink roster. Pick your login below &mdash; you&rsquo;ll set up your
          games, languages and verification in the next step.
        </p>

        <JoinForm token={token} presetEmail={invite.email ?? ""} />

        <p className="join-card__foot">
          Already have an account?{" "}
          <Link href="/">Sign in instead</Link>
        </p>
      </div>
    </main>
  );
}
