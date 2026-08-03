"use client";

import { useState } from "react";

interface Props {
  /** Route that redirects to a short-lived signed URL. */
  src: string;
  name?: string | null;
  alt?: string;
}

/**
 * Thumbnail for a file in a private bucket. The src points at our own view
 * route, which checks the caller and 302s to a signed URL — so the browser
 * renders it like any image without a public link ever existing. PDFs and
 * anything that fails to decode fall back to a file badge.
 */
export function PrivateImage({ src, name, alt = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const isPdf = (name ?? "").toLowerCase().endsWith(".pdf");

  if (isPdf || failed) {
    return (
      <a className="private-file" href={src} target="_blank" rel="noreferrer">
        <i className="fa-solid fa-file-lines" aria-hidden="true" />
        <span>{isPdf ? "PDF document" : "Preview unavailable"}</span>
      </a>
    );
  }

  return (
    <a className="private-image" href={src} target="_blank" rel="noreferrer" title="Open full size">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      <span className="private-image__zoom">
        <i className="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true" />
      </span>
    </a>
  );
}
