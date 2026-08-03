"use client";

import { useRef, useState, type DragEvent } from "react";

interface Props {
  /** Called with the chosen file — validation and upload belong to the caller. */
  onFile: (file: File) => void | Promise<void>;
  accept?: string;
  label?: string;
  hint?: string;
  /** Image to show instead of the empty state (a preview or an existing file). */
  preview?: string | null;
  busy?: boolean;
  disabled?: boolean;
}

/**
 * One drag-and-drop file field for the whole dashboard — identity documents,
 * result screenshots, anything that comes later. Keeps a real <input> behind
 * it so clicking and keyboard use work, rather than a div that only responds
 * to a drop.
 */
export function FileDrop({
  onFile,
  accept = "image/*",
  label = "Drag & drop a file",
  hint = "or click to browse",
  preview,
  busy = false,
  disabled = false,
}: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function take(file: File | undefined) {
    if (!file || disabled || busy) return;
    onFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files?.[0]);
  }

  return (
    <div
      className={`file-drop${over ? " is-over" : ""}${disabled ? " is-disabled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => !disabled && !busy && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="file-drop__preview" />
      ) : (
        <span className="file-drop__icon">
          <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"}`} aria-hidden="true" />
        </span>
      )}

      <span className="file-drop__text">
        <strong>{busy ? "Uploading…" : label}</strong>
        <span>{hint}</span>
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled || busy}
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
