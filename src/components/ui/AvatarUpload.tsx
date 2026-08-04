"use client";

import { useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const MAX_DIMENSION = 192;
const JPEG_QUALITY = 0.8;
const MAX_DATA_URL_LENGTH = 60_000;
const DEFAULT_AVATAR = "/avatars/default.webp";

// No object-storage backend is wired up in this app (no S3/Supabase
// Storage bucket, no upload API route) — so instead of faking an upload
// that goes nowhere, this genuinely reads the dropped/picked file client-
// side, downscales it to a small square via canvas, and stores the result
// as a data: URL in the same avatarUrl text column the old URL-only field
// wrote to. That keeps it a real, working upload (no placeholder/fake
// state) without inventing a storage service this project doesn't have.
function readAndResizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a readable image."));
      img.onload = () => {
        const size = Math.min(MAX_DIMENSION, Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Couldn't process that image."));
          return;
        }
        // Cover-crop to a centered square so avatars aren't stretched.
        const scale = size / Math.min(img.width, img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        ctx.drawImage(img, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        if (dataUrl.length > MAX_DATA_URL_LENGTH) {
          reject(new Error("That image is still too large after processing. Please choose a smaller file."));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AvatarUpload({ value, onChange, label = "Profile picture" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      onChange(await readAndResizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image.");
    }
  }

  return (
    <div className="form-row">
      <label>{label}</label>
      <div
        className={`avatar-upload${dragOver ? " is-dragover" : ""}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload profile picture"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <span className="avatar-upload__preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value || DEFAULT_AVATAR} alt="" />
        </span>
        <span className="avatar-upload__hint">
          <strong>Drag &amp; drop</strong> an image, or click to browse
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="avatar-upload__input"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {value && (
        <button type="button" className="avatar-upload__remove" onClick={() => onChange("")}>
          <i className="fa-solid fa-trash" aria-hidden="true" /> Remove picture
        </button>
      )}
      {error && (
        <p className="form-row__error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
