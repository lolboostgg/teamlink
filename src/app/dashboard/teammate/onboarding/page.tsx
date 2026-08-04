import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadOnboardingSubject } from "@/lib/teammateGate";
import { onboardingSteps, isOnboardingComplete } from "@/lib/teammateOnboarding";

export const metadata: Metadata = { title: "Finish your setup" };
export const dynamic = "force-dynamic";

export default async function TeammateOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const subject = await loadOnboardingSubject(session.user.id);
  if (!subject) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Finish your setup</div>
            <div className="dashboard-panel__sub">No teammate profile is linked to this account yet.</div>
          </div>
        </div>
      </div>
    );
  }

  // Nothing left to do — sitting on a completed checklist would be a dead end.
  if (isOnboardingComplete(subject)) redirect("/dashboard/teammate");

  const steps = onboardingSteps(subject);
  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  return (
    <div className="dashboard-panel onboarding-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Finish your setup</div>
          <div className="dashboard-panel__sub">
            Your dashboard unlocks once every step is done. You can leave and come back &mdash; nothing is lost.
          </div>
        </div>
        <span className="dashboard-pill dashboard-pill--muted">
          {done} of {steps.length} done
        </span>
      </div>

      <div className="onboarding-progress" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length}>
        <span style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      <ol className="onboarding-steps">
        {steps.map((step) => (
          <li key={step.key} className={`onboarding-step${step.done ? " is-done" : ""}`}>
            <span className="onboarding-step__mark" aria-hidden="true">
              <i className={step.done ? "fa-solid fa-check" : step.icon} />
            </span>
            <div className="onboarding-step__copy">
              <strong>{step.title}</strong>
              <span>{step.description}</span>
              {!step.done && step.detail && <em>{step.detail}</em>}
            </div>
            {step.done ? (
              <span className="onboarding-step__state">Done</span>
            ) : (
              <Link href={step.href} className={`btn btn--sm ${step === next ? "btn--vivid" : "btn--ghost"}`}>
                {step === next ? "Continue" : "Open"}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
