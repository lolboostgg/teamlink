"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { FileDrop } from "@/components/ui/FileDrop";
import { PrivateImage } from "@/components/ui/PrivateImage";

/**
 * One identity document: preview if it's already there, drop zone either way.
 * Shared by the verification page and the onboarding wizard so both upload
 * through exactly the same route and show the same states.
 */
export function DocumentUpload({
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

export const KYC_DOCUMENTS = [
  { kind: "id-front", label: "ID front", field: "idFrontPath" },
  { kind: "id-back", label: "ID back", field: "idBackPath" },
  { kind: "selfie", label: "Selfie holding the ID", field: "selfiePath" },
] as const;
