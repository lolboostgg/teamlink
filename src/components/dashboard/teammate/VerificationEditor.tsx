"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { FileDrop } from "@/components/ui/FileDrop";
import { PrivateImage } from "@/components/ui/PrivateImage";
import { Modal } from "@/components/ui/Modal";
import {
  PAYOUT_FIELDS,
  PAYOUT_LABELS,
  countryUsesIban,
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

interface PayoutSelectOption { value: string; label: string; }

const COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
// Full set of circulating ISO 4217 codes — the list is searchable, so there's
// no reason to pre-trim it to the "common" ones.
const CURRENCY_CODES = "AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW ZWG".split(" ");

function displayOptions(codes: string[], type: "region" | "currency") {
  const names = new Intl.DisplayNames(["en"], { type });
  return codes.map((value) => ({ value, label: names.of(value) ?? value })).sort((a, b) => a.label.localeCompare(b.label));
}

function SearchablePayoutSelect({ label, value, options, searchable = false, placeholder, onChange }: { label: string; value: string; options: PayoutSelectOption[]; searchable?: boolean; placeholder: string; onChange: (value: string) => void; }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value || option.label === value);
  const filtered = useMemo(() => options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return <div className={`payout-select${open ? " is-open" : ""}`} ref={rootRef}>
    <button type="button" className="payout-select__trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => { setOpen((current) => !current); setQuery(""); }}><span className={selected || value ? "" : "is-placeholder"}>{selected?.label ?? (value || placeholder)}</span><i className="fa-solid fa-chevron-down" aria-hidden="true" /></button>
    {open && <div className="payout-select__popover">{searchable && <label className="payout-select__search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}…`} /></label>}<ul id={listId} role="listbox" aria-label={label}>{filtered.map((option) => <li key={option.value}><button type="button" role="option" aria-selected={option.value === selected?.value} onClick={() => { onChange(option.value); setOpen(false); setQuery(""); }}><span><strong>{option.label}</strong><small>{option.value}</small></span>{option.value === selected?.value && <i className="fa-solid fa-check" aria-hidden="true" />}</button></li>)}</ul>{filtered.length === 0 && <p>No matches found.</p>}</div>}
  </div>;
}

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

      {path && <PrivateImage src={`/api/kyc/view?path=${encodeURIComponent(path)}`} name={path} alt={label} />}

      <FileDrop
        accept="image/jpeg,image/png,image/webp,application/pdf"
        label={path ? "Drop a new file to replace" : "Drag & drop the document"}
        hint="JPG, PNG, WEBP or PDF · max 8 MB"
        busy={busy}
        disabled={disabled}
        onFile={upload}
      />
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
    <div className="verification-split">
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
    </div>
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [choosingType, setChoosingType] = useState(false);
  const countryOptions = useMemo(() => displayOptions(COUNTRY_CODES, "region"), []);
  const currencyOptions = useMemo(() => displayOptions(CURRENCY_CODES, "currency"), []);
  const selectedCountry = countryOptions.find((country) => country.value === draft.country || country.label === draft.country)?.value ?? draft.country;
  const usesIban = countryUsesIban(selectedCountry);
  const visibleFields = PAYOUT_FIELDS[type].filter((field) => type !== "BANK" || (field.key !== "iban" && field.key !== "accountNumber") || (usesIban ? field.key === "iban" : field.key === "accountNumber"));

  function reset() {
    setDraft({});
    setEditingId(undefined);
    setEditorOpen(false);
    setChoosingType(false);
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
        {!editorOpen && <button type="button" className="btn btn--vivid btn--sm" onClick={() => { setDraft({}); setEditingId(undefined); setChoosingType(true); setEditorOpen(true); }}><i className="fa-solid fa-plus" aria-hidden="true" /> Add payout method</button>}
      </div>

      {methods.length > 0 ? <div className="payout-methods-list">{methods.map((m) => <article className={`payout-method-card${m.isDefault ? " is-default" : ""}`} key={m.id}>
        <span className="payout-method-card__icon"><i className={m.type === "BANK" ? "fa-solid fa-building-columns" : "fa-brands fa-bitcoin"} aria-hidden="true" /></span>
        <div className="payout-method-card__details"><span>{PAYOUT_LABELS[m.type]}</span><strong>{describePayoutMethod(m.type, m.details)}</strong></div>
        {m.isDefault ? <span className="dashboard-pill dashboard-pill--success"><i className="fa-solid fa-star" aria-hidden="true" /> Default</span> : <button type="button" className="btn btn--ghost btn--sm" disabled={pending} onClick={() => onRun(() => makeDefault(m.id), "Default updated.")}><i className="fa-regular fa-star" aria-hidden="true" /> Set default</button>}
        <div className="payout-method-card__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setType(m.type); setDraft(m.details); setEditingId(m.id); setChoosingType(false); setEditorOpen(true); }}><i className="fa-solid fa-pen" aria-hidden="true" /> Edit</button>
          <button type="button" className="btn btn--danger btn--sm" disabled={pending} onClick={() => onRun(() => deletePayoutMethod(m.id), "Method removed.")} aria-label={`Delete ${PAYOUT_LABELS[m.type]}`}><i className="fa-solid fa-trash" aria-hidden="true" /></button>
        </div>
      </article>)}</div> : <div className="dashboard-empty dashboard-empty--compact"><i className="fa-solid fa-wallet" aria-hidden="true" /><p>No payout method saved yet.</p></div>}

      <Modal open={editorOpen} onClose={reset} labelledBy="payout-method-modal-title"><div className="payout-method-modal"><div className="payout-method-editor">
      <div className="payout-method-editor__head"><div><strong id="payout-method-modal-title">{choosingType ? "Bank Transfer or Crypto?" : editingId ? `Edit ${PAYOUT_LABELS[type]}` : `Add ${PAYOUT_LABELS[type]}`}</strong><span>{choosingType ? "Choose where your earnings should be paid." : editingId ? "Update the details for this payout method." : "Enter and confirm your payout details."}</span></div></div>
      {choosingType && <div className="payout-method-picker" aria-label="Select your payout method">
        {(Object.keys(PAYOUT_LABELS) as PayoutMethodType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`payout-method-option${type === t ? " is-active" : ""}`}
            onClick={() => {
              setType(t);
              setDraft({});
              setEditingId(undefined);
              setChoosingType(false);
            }}
          >
            <span className="payout-method-option__icon"><i className={t === "BANK" ? "fa-solid fa-building-columns" : "fa-brands fa-bitcoin"} aria-hidden="true" /></span>
            <span><strong>{PAYOUT_LABELS[t]}</strong><small>{t === "BANK" ? "SEPA and international transfer" : "USDT, USDC and supported coins"}</small><em>{t === "BANK" ? "2% processing fee" : "5% network fee"}</em></span>
            <i className={type === t ? "fa-solid fa-circle-check" : "fa-regular fa-circle"} aria-hidden="true" />
          </button>
        ))}
      </div>}

      {!choosingType && <><div className="payout-method-notice"><i className="fa-solid fa-circle-info" aria-hidden="true" /><span>{type === "BANK" ? "The beneficiary name must match the bank account holder exactly." : "The name must match your wallet or exchange account exactly. Incorrect details can delay payouts."}</span></div>

      <div className="form-row-grid">
        {visibleFields.map((field) => (
          <div className={`form-row${field.key === "address" || field.key === "wallet" ? " payout-method-field--wide" : ""}`} key={field.key}>
            <label htmlFor={`payout-${field.key}`}>
              {field.label}
              {(field.required || field.key === "iban" || field.key === "accountNumber") && " *"}
            </label>
            {field.key === "country" ? <SearchablePayoutSelect label="Country" value={draft.country ?? ""} options={countryOptions} searchable placeholder="Select a country" onChange={(value) => setDraft({ ...draft, country: value, iban: "", accountNumber: "" })} /> : field.key === "currency" ? <SearchablePayoutSelect label="Currency" value={draft.currency ?? ""} options={currencyOptions} searchable placeholder="Select a currency" onChange={(value) => setDraft({ ...draft, currency: value })} /> : <input
              id={`payout-${field.key}`}
              value={draft[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
            />}
          </div>
        ))}
      </div>

      <div className="teammate-profile-form__actions">
        {!editingId && <button type="button" className="btn btn--ghost" onClick={() => setChoosingType(true)}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back</button>}
        <button
          type="button"
          className="btn btn--vivid"
          disabled={pending}
          onClick={() =>
            onRun(async () => {
              const missing = visibleFields.filter((f) => (f.required || f.key === "iban" || f.key === "accountNumber") && !draft[f.key]?.trim());
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
          <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {editingId ? "Save method" : "Add payout method"}
        </button>
      </div></>}
      </div></div></Modal>
    </div>
  );
}
