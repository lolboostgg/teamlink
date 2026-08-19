import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/brand/Logo";
import { openHandover, handoverState } from "@/lib/orderHandover";
import { handoverEligibility } from "@/lib/dispatch/waves";
import { HandoverDecision } from "@/app/handover/[token]/HandoverDecision";

export const metadata: Metadata = { title: "Take over a session · QUP.gg" };
export const dynamic = "force-dynamic";

const DEAD_COPY: Record<string, { title: string; body: string }> = {
  accepted: {
    title: "This handover was already taken",
    body: "Somebody accepted this session before you got here. Ask for a fresh link if it was meant for you.",
  },
  declined: {
    title: "This handover was already declined",
    body: "The offer was turned down. Whoever sent it can create a new link.",
  },
  revoked: {
    title: "This link was replaced",
    body: "A newer handover link was made for this session, which puts this one out. Ask for the current one.",
  },
  expired: {
    title: "This handover has expired",
    body: "Handover links are only good for half an hour. Ask for a new one and you're good to go.",
  },
  stale: {
    title: "This session has moved on",
    body: "It already started, or it is no longer running. There is nothing left to take over.",
  },
  missing: {
    title: "We don't know this handover",
    body: "The link looks incomplete or was mistyped. Copying it again usually fixes it.",
  },
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="join-screen">
      <div className="join-card">{children}</div>
    </main>
  );
}

export default async function HandoverPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const handover = await openHandover(token);
  const state = handover ? handoverState(handover) : "missing";

  if (!handover || state !== "open") {
    const copy = DEAD_COPY[state] ?? DEAD_COPY.missing;
    return (
      <Shell>
        <Logo withWordmark />
        <span className="join-card__icon join-card__icon--dead">
          <i className="fa-solid fa-link-slash" aria-hidden="true" />
        </span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <Link href="/dashboard/teammate" className="btn btn--ghost btn--sm">
          Back to your panel
        </Link>
      </Shell>
    );
  }

  // Who is looking. A handover is teammate-to-teammate, so an anonymous
  // visitor or a customer who was forwarded the link gets told what this is
  // and nothing else — the link proves possession, not that its holder can
  // take the order.
  const session = await auth();
  const viewer = session?.user?.id
    ? await prisma.teammate.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  const { order, fromTeammate } = handover;
  const summary = (
    <>
      <span className="join-card__icon">
        <i className="fa-solid fa-people-arrows" aria-hidden="true" />
      </span>
      <h1>{fromTeammate.name} wants to hand you a session</h1>
      <p>
        Order #{order.orderNo} — {order.gameName} · {order.option}
        {order.ignRank ? ` · ${order.ignRank}` : ""}
        {order.ignRegion ? ` · ${order.ignRegion.toUpperCase()}` : ""}
      </p>
      {handover.note ? <p className="join-card__note">“{handover.note}”</p> : null}
    </>
  );

  if (!viewer) {
    return (
      <Shell>
        <Logo withWordmark />
        {summary}
        <p>
          {session?.user?.id
            ? "This account isn't a teammate account, so it can't take sessions."
            : "Sign in with your teammate account to accept or decline."}
        </p>
        <Link href="/dashboard/teammate" className="btn btn--vivid btn--sm">
          {session?.user?.id ? "Back to QUP.gg" : "Sign in"}
        </Link>
      </Shell>
    );
  }

  // Checked here so the answer is on screen before anyone clicks, but never
  // trusted: acceptHandover() runs the same check inside its transaction,
  // because anything decided at render time is already stale by the click.
  const eligible =
    viewer.id === handover.fromTeammateId
      ? { ok: false as const, reason: "This session is already yours." }
      : await handoverEligibility(prisma, viewer.id, order, new Date());

  return (
    <Shell>
      <Logo withWordmark />
      {summary}
      {eligible.ok ? (
        <HandoverDecision token={token} />
      ) : (
        <>
          <p className="join-card__dead-reason">{eligible.reason}</p>
          <Link href="/dashboard/teammate" className="btn btn--ghost btn--sm">
            Back to your panel
          </Link>
        </>
      )}
    </Shell>
  );
}
