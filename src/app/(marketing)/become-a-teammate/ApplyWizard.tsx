"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { IconSelect } from "@/components/ui/IconSelect";
import { submitTeammateApplication } from "@/app/actions/applications";
import { COUNTRIES, countryName } from "@/lib/countries";
import { GAMES } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";

/**
 * The teammate application, as a four-step wizard in a modal.
 *
 * It used to be one long form at the bottom of the page, which asked for
 * eight things at once and validated them with the browser's own tooltips —
 * a grey OS bubble that points at one field, says its piece and disappears.
 * A step at a time keeps each screen to a couple of questions, and every
 * error is rendered as part of the field it belongs to and stays there.
 *
 * The provider exists so the hero button and the panel further down the page
 * can both open the same wizard without either of them owning it.
 */

const HOURS = ["Under 5 hours", "5–10 hours", "10–20 hours", "20+ hours"];

interface Draft {
  name: string;
  email: string;
  discord: string;
  country: string | null;
  games: string[];
  ranks: string;
  hours: string;
  experience: string;
  website: string;
}

const EMPTY: Draft = {
  name: "",
  email: "",
  discord: "",
  country: null,
  games: [],
  ranks: "",
  hours: HOURS[1],
  experience: "",
  website: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FieldErrors = Partial<Record<keyof Draft, string>>;

const STEPS = [
  { title: "About you", hint: "So we know who we are talking to." },
  { title: "Your games", hint: "Only what you could take an order in today." },
  { title: "Availability", hint: "Roughly, and honestly — it decides your orders." },
  { title: "Review", hint: "One last look before it goes." },
];

interface ApplyWizardValue {
  open: () => void;
}

const ApplyWizardContext = createContext<ApplyWizardValue | null>(null);

export function useApplyWizard() {
  const ctx = useContext(ApplyWizardContext);
  if (!ctx) throw new Error("useApplyWizard must be used inside ApplyWizardProvider");
  return ctx;
}

export function ApplyWizardProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <ApplyWizardContext.Provider value={value}>
      {children}
      <ApplyWizard open={isOpen} onClose={() => setIsOpen(false)} />
    </ApplyWizardContext.Provider>
  );
}

/** Any trigger, anywhere on the page, opening the one wizard. */
export function ApplyButton({ className, children }: { className?: string; children: ReactNode }) {
  const { open } = useApplyWizard();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`wizard-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {/* role=alert so the message is announced when it appears, and it stays
          on screen until the field is fixed — unlike the native bubble. */}
      {error ? (
        <p className="wizard-field__error" role="alert">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="wizard-field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

function ApplyWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const countryOptions = useMemo(
    () => COUNTRIES.map((c) => ({ value: c.code, label: c.name, icon: `/flags/${c.code}.svg` })),
    [],
  );

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // Clearing on edit rather than on the next submit: an error that stays
    // put while you are visibly fixing it reads as broken.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setFormError(null);
  }

  function toggleGame(slug: string) {
    setDraft((prev) => ({
      ...prev,
      games: prev.games.includes(slug) ? prev.games.filter((s) => s !== slug) : [...prev.games, slug],
    }));
    setErrors((prev) => (prev.games ? { ...prev, games: undefined } : prev));
  }

  function validate(which: number): boolean {
    const next: FieldErrors = {};
    if (which === 0) {
      if (!draft.name.trim()) next.name = "We need something to call you.";
      if (!draft.email.trim()) next.email = "We reply by email, so this one is required.";
      else if (!EMAIL.test(draft.email.trim())) next.email = "That does not look like a full address yet.";
      if (!draft.discord.trim()) next.discord = "Your Discord username — it is how we reach you.";
      if (!draft.country) next.country = "Pick the country you play from.";
    }
    if (which === 1 && draft.games.length === 0) {
      next.games = "Pick at least one game you could take an order in.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function submit() {
    // Every step again, not just the last one: the review screen can be
    // reached and then the earlier answers edited back out.
    if (!validate(0)) {
      setStep(0);
      return;
    }
    if (!validate(1)) {
      setStep(1);
      return;
    }
    startTransition(async () => {
      const result = await submitTeammateApplication({
        name: draft.name,
        email: draft.email,
        discord: draft.discord,
        country: draft.country ?? "",
        games: draft.games,
        ranks: draft.ranks,
        hours: draft.hours,
        experience: draft.experience,
        website: draft.website,
      });
      if (!result.ok) {
        setFormError(result.error ?? "That didn't send. Try again in a moment.");
        return;
      }
      setSent(true);
    });
  }

  function close() {
    onClose();
    // Reset only once it is out of sight, so the panel does not visibly
    // rewind to step one as it closes.
    window.setTimeout(() => {
      setStep(0);
      setSent(false);
      setErrors({});
      setFormError(null);
      setDraft(EMPTY);
    }, 250);
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={close} labelledBy="apply-wizard-title">
      <div className="apply-wizard">
        {sent ? (
          <div className="apply-done">
            <span className="apply-done__icon">
              <i className="fa-solid fa-check" aria-hidden="true" />
            </span>
            <h2 id="apply-wizard-title">Application in</h2>
            <p>
              We read every one, usually within two or three days. If it is a fit you get an invite link by email —
              that link is what creates your teammate account, so keep an eye out for it.
            </p>
            <button type="button" className="btn btn--vivid" onClick={close}>
              Done
            </button>
          </div>
        ) : (
          <>
            <header className="apply-wizard__head">
              <span className="apply-wizard__eyebrow">
                Step {step + 1} of {STEPS.length}
              </span>
              <h2 id="apply-wizard-title">{STEPS[step].title}</h2>
              <p>{STEPS[step].hint}</p>

              <ol className="apply-steps">
                {STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    className={`apply-steps__item${i === step ? " is-current" : ""}${i < step ? " is-done" : ""}`}
                  >
                    <button
                      type="button"
                      // Back is always allowed; forward has to pass the step
                      // you are standing on, same as the Next button.
                      onClick={() => (i < step ? setStep(i) : i === step ? undefined : validate(step) && setStep(i))}
                      aria-current={i === step ? "step" : undefined}
                    >
                      <span className="apply-steps__dot">
                        {i < step ? <i className="fa-solid fa-check" aria-hidden="true" /> : i + 1}
                      </span>
                      <span className="apply-steps__label">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </header>

            {/* noValidate: the browser's own bubbles are the thing being
                replaced here — see Field above. */}
            <form
              className="apply-wizard__body"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (step === STEPS.length - 1) submit();
                else goNext();
              }}
            >
              <input
                className="hp-field"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={draft.website}
                onChange={(e) => set("website", e.target.value)}
              />

              {step === 0 && (
                <div className="apply-pane">
                  <div className="wizard-grid">
                    <Field id="w-name" label="Your name" error={errors.name}>
                      <input
                        id="w-name"
                        autoFocus
                        value={draft.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="What your teammates call you"
                      />
                    </Field>
                    <Field id="w-email" label="Email" error={errors.email} hint="Your invite link goes here.">
                      <input
                        id="w-email"
                        type="email"
                        value={draft.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="you@example.com"
                      />
                    </Field>
                  </div>

                  <div className="wizard-grid">
                    <Field id="w-discord" label="Discord username" error={errors.discord}>
                      <input
                        id="w-discord"
                        value={draft.discord}
                        onChange={(e) => set("discord", e.target.value)}
                        placeholder="yourname"
                      />
                    </Field>
                    <div className={`wizard-field${errors.country ? " has-error" : ""}`}>
                      <label htmlFor="w-country">Country</label>
                      <IconSelect
                        label="Country"
                        value={draft.country}
                        options={countryOptions}
                        placeholder="Choose your country"
                        searchable
                        onChange={(value) => set("country", value)}
                      />
                      {errors.country && (
                        <p className="wizard-field__error" role="alert">
                          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                          {errors.country}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="apply-pane">
                  <div className={`wizard-field${errors.games ? " has-error" : ""}`}>
                    <label>Games you can take orders in</label>
                    <div className="game-picker">
                      {GAMES.map((game) => {
                        const on = draft.games.includes(game.slug);
                        return (
                          <button
                            type="button"
                            key={game.slug}
                            className={`game-pick${on ? " is-on" : ""}`}
                            aria-pressed={on}
                            onClick={() => toggleGame(game.slug)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={gameIcon(game.slug)} alt="" loading="lazy" />
                            <span>{game.name}</span>
                            <i className="fa-solid fa-check" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                    {errors.games && (
                      <p className="wizard-field__error" role="alert">
                        <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                        {errors.games}
                      </p>
                    )}
                  </div>

                  <Field
                    id="w-ranks"
                    label="Your ranks"
                    hint="Whatever proves the level — a rank, an LP number, a tracker link."
                  >
                    <input
                      id="w-ranks"
                      value={draft.ranks}
                      onChange={(e) => set("ranks", e.target.value)}
                      placeholder="e.g. Master 250 LP EUW, Immortal 2"
                    />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="apply-pane">
                  <div className="wizard-field">
                    <label>Hours a week you could be online</label>
                    <div className="segmented">
                      {HOURS.map((h) => (
                        <button
                          type="button"
                          key={h}
                          className={`segmented__option${draft.hours === h ? " is-on" : ""}`}
                          aria-pressed={draft.hours === h}
                          onClick={() => set("hours", h)}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field
                    id="w-experience"
                    label="Anything else worth knowing"
                    hint="Optional, and the part we actually read closely."
                  >
                    <textarea
                      id="w-experience"
                      rows={6}
                      value={draft.experience}
                      onChange={(e) => set("experience", e.target.value)}
                      placeholder="Coaching or teammate experience, op.gg or tracker links, languages you speak, the hours you usually play."
                    />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="apply-pane">
                  <dl className="apply-review">
                    <div>
                      <dt>Name</dt>
                      <dd>{draft.name}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{draft.email}</dd>
                    </div>
                    <div>
                      <dt>Discord</dt>
                      <dd>{draft.discord}</dd>
                    </div>
                    <div>
                      <dt>Country</dt>
                      <dd>
                        {draft.country && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="flag-icon" src={`/flags/${draft.country}.svg`} alt="" />
                        )}
                        {countryName(draft.country) ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Games</dt>
                      <dd className="apply-review__games">
                        {draft.games.map((slug) => (
                          <span key={slug}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={gameIcon(slug)} alt="" />
                            {GAMES.find((g) => g.slug === slug)?.name ?? slug}
                          </span>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt>Ranks</dt>
                      <dd>{draft.ranks || "—"}</dd>
                    </div>
                    <div>
                      <dt>Availability</dt>
                      <dd>{draft.hours}</dd>
                    </div>
                  </dl>

                  <p className="apply-terms">
                    You must be 18 or older, and you will verify your identity before your first payout. One
                    application per email address.
                  </p>
                </div>
              )}

              {formError && (
                <p className="wizard-form-error" role="alert">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  {formError}
                </p>
              )}

              <footer className="apply-wizard__foot">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => (step === 0 ? close() : setStep((s) => s - 1))}
                  disabled={pending}
                >
                  {step === 0 ? "Cancel" : "Back"}
                </button>

                <div className="apply-wizard__progress" aria-hidden="true">
                  <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
                </div>

                <button type="submit" className="btn btn--vivid" disabled={pending}>
                  {step === STEPS.length - 1 ? (
                    pending ? (
                      "Sending…"
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Send application
                      </>
                    )
                  ) : (
                    <>
                      Continue <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </>
                  )}
                </button>
              </footer>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
