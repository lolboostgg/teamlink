"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PAYOUT_FIELDS,
  PAYOUT_LABELS,
  describePayoutMethod,
  type PayoutMethodType,
} from "@/lib/payoutMethods";
import {
  savePersonalDetails,
  submitForReview,
  savePayoutMethod,
  makeDefault,
  deletePayoutMethod,
} from "@/app/dashboard/teammate/verification/actions";

export interface VerificationView {
  status: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  country: string;
  idFrontPath: string | null;
  idBackPath: string | null;
  selfiePath: string | null;
  reviewNote: string | null;
}

export interface PayoutMethodView {
  id: string;
  type: PayoutMethodType;
  details: Record<string, string>;
  isDefault: boolean;
}

const STATUS_PILL: Record<string, string> = {
  UNSUBMITTED: "dashboard-pill--muted",
  PENDING: "dashboard-pill--warning",
  APPROVED: "dashboard-pill--success",
  REJECTED: "dashboard-pill--warning",
};

const DOCUMENTS = [
  { kind: "id-front", label: "ID front", field: "idFrontPath" },
  { kind: "id-back", label: "ID back", field: "idBackPath" },
  { kind: "selfie", label: "Selfie holding the ID", field: "selfiePath" },
] as const;

function DocumentUpload({
  kind,
  label,
  path,
  disabled,
  onUploaded,
}: {
  kind: string;
  label: string;
  path: string | null;
  disabled: boolean;
  onUploaded: () => void;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("kind", kind);
      body.append("file", file);
      const res = await fetch("/api/kyc/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      showToast(`${label} uploaded.`, "success");
      onUploaded();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kyc-doc">
      <div className="kyc-doc__head">
        <span>{label}</span>
        {path ? (
          <span className="kyc-doc__state kyc-doc__state--ok">
            <i className="fa-solid fa-circle-check" aria-hidden="true" /> uploaded
          </span>
        ) : (
          <span className="kyc-doc__state">missing</span>
        )}
      </div>

      <div className="kyc-doc__actions">
        <label className={`btn btn--ghost btn--sm${busy || disabled ? " is-disabled" : ""}`}>
          {busy ? "Uploading..." : path ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            disabled={busy || disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {path && (
          <a
            className="btn btn--ghost btn--sm"
            href={`/api/kyc/view?path=${encodeURIComponent(path)}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-solid fa-eye" aria-hidden="true" /> View
          </a>
        )}
      </div>
    </div>
  );
}

export function VerificationEditor({
  verification,
  methods,
  storageReady,
}: {
  verification: VerificationView;
  methods: PayoutMethodView[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [details, setDetails] = useState({
    fullName: verification.fullName,
    dateOfBirth: verification.dateOfBirth,
    address: verification.address,
    country: verification.country,
  });
  const [pending, startTransition] = useTransition();
  const locked = verification.status === "PENDING" || verification.status === "APPROVED";

  function run(fn: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await fn();
        showToast(success, "success");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      }
    });
  }

  return (
    <>
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">
              Identity verification{" "}
              <span className={`dashboard-pill ${STATUS_PILL[verification.status] ?? "dashboard-pill--muted"}`}>
                {verification.status.toLowerCase()}
              </span>
            </div>
            <div className="dashboard-panel__sub">
              Payouts are only released once your identity is confirmed. Your documents are stored privately and are
              visible to admins only.
            </div>
          </div>
        </div>

        {verification.reviewNote && verification.status === "REJECTED" && (
          <p className="form-row__error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {verification.reviewNote}
          </p>
        )}

        {!storageReady && (
          <p className="form-row__hint">
            Document uploads are switched off — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY aren&rsquo;t configured yet.
          </p>
        )}

        <div className="form-row-grid">
          <div className="form-row">
            <label htmlFor="kyc-name">Full name</label>
            <input
              id="kyc-name"
              value={details.fullName}
              disabled={locked}
              onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label htmlFor="kyc-dob">Date of birth</label>
            <input
              id="kyc-dob"
              placeholder="DD-MM-YYYY"
              value={details.dateOfBirth}
              disabled={locked}
              onChange={(e) => setDetails({ ...details, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label htmlFor="kyc-address">Address</label>
            <input
              id="kyc-address"
              value={details.address}
              disabled={locked}
              onChange={(e) => setDetails({ ...details, address: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label htmlFor="kyc-country">Country</label>
            <input
              id="kyc-country"
              value={details.country}
              disabled={locked}
              onChange={(e) => setDetails({ ...details, country: e.target.value })}
            />
          </div>
        </div>

        <div className="kyc-docs">
          {DOCUMENTS.map((doc) => (
            <DocumentUpload
              key={doc.kind}
              kind={doc.kind}
              label={doc.label}
              path={verification[doc.field]}
              disabled={locked || !storageReady}
              onUploaded={() => router.refresh()}
            />
          ))}
        </div>

        <div className="teammate-profile-form__actions">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={pending || locked}
            onClick={() => run(() => savePersonalDetails(details), "Details saved.")}
          >
            Save details
          </button>
          <button
            type="button"
            className="btn btn--vivid"
            disabled={pending || locked}
            onClick={() => run(() => submitForReview(), "Sent for review.")}
          >
            {verification.status === "PENDING" ? "Awaiting review" : "Submit for review"}
          </button>
        </div>
      </div>

      <PayoutMethods methods={methods} onRun={run} pending={pending} />
    </>
  );
}

function PayoutMethods({
  methods,
  onRun,
  pending,
}: {
  methods: PayoutMethodView[];
  onRun: (fn: () => Promise<void>, success: string) => void;
  pending: boolean;
}) {
  const [type, setType] = useState<PayoutMethodType>("BANK");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | undefined>();

  function reset() {
    setDraft({});
    setEditingId(undefined);
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Payout methods</div>
          <div className="dashboard-panel__sub">
            Where your earnings go. The beneficiary name has to match the account holder exactly.
          </div>
        </div>
      </div>

      {methods.length > 0 && (
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Details</th>
              <th>Default</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.id}>
                <td className="dashboard-table__primary">{PAYOUT_LABELS[m.type]}</td>
                <td>{describePayoutMethod(m.type, m.details)}</td>
                <td>
                  {m.isDefault ? (
                    <span className="dashboard-pill dashboard-pill--success">default</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={pending}
                      onClick={() => onRun(() => makeDefault(m.id), "Default updated.")}
                    >
                      Make default
                    </button>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setType(m.type);
                      setDraft(m.details);
                      setEditingId(m.id);
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={pending}
                    onClick={() => onRun(() => deletePayoutMethod(m.id), "Method removed.")}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="profile-tabs">
        {(Object.keys(PAYOUT_LABELS) as PayoutMethodType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`profile-tab${type === t ? " is-active" : ""}`}
            onClick={() => {
              setType(t);
              setDraft({});
              setEditingId(undefined);
            }}
          >
            <i className={t === "BANK" ? "fa-solid fa-building-columns" : "fa-brands fa-bitcoin"} aria-hidden="true" />
            {PAYOUT_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="form-row-grid">
        {PAYOUT_FIELDS[type].map((field) => (
          <div className="form-row" key={field.key}>
            <label htmlFor={`payout-${field.key}`}>
              {field.label}
              {field.required && " *"}
            </label>
            <input
              id={`payout-${field.key}`}
              value={draft[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="teammate-profile-form__actions">
        {editingId && (
          <button type="button" className="btn btn--ghost" onClick={reset}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="btn btn--vivid"
          disabled={pending}
          onClick={() =>
            onRun(async () => {
              const missing = PAYOUT_FIELDS[type].filter((f) => f.required && !draft[f.key]?.trim());
              if (missing.length > 0) throw new Error(`Missing: ${missing.map((f) => f.label).join(", ")}.`);
              await savePayoutMethod({
                id: editingId,
                type,
                details: draft,
                isDefault: methods.length === 0,
              });
              reset();
            }, editingId ? "Method updated." : "Method added.")
          }
        >
          {editingId ? "Save method" : "Add method"}
        </button>
      </div>
    </div>
  );
}
