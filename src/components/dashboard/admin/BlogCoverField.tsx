"use client";

import { useRef, useState } from "react";

export function BlogCoverField({ initialValue = "" }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  async function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 4_000_000) return setError("The title image must be smaller than 4 MB.");
    setUploading(true); setError("");
    const body = new FormData(); body.set("file", file);
    try { const response = await fetch("/api/admin/blog-image", { method: "POST", body }); const result = await response.json() as { url?: string; error?: string }; if (!response.ok || !result.url) throw new Error(result.error || "Upload failed."); setValue(result.url); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Upload failed."); }
    finally { setUploading(false); }
  }
  return <div className="admin-blog-cover"><input type="hidden" name="coverImageUrl" value={value}/><span className="admin-blog-cover__label">Title image {uploading && <small>uploading…</small>}</span><input ref={inputRef} className="admin-blog-cover__input" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={event => void pick(event.target.files?.[0])}/><button type="button" className={`admin-blog-dropzone${dragging ? " is-dragging" : ""}${value ? " has-image" : ""}`} disabled={uploading} onClick={() => inputRef.current?.click()} onDragEnter={event => { event.preventDefault(); setDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void pick(event.dataTransfer.files[0]); }}>
    {value ? <><img src={value} alt="Title image preview"/><span className="admin-blog-dropzone__replace"><i className="fa-solid fa-arrows-rotate"/> Replace image</span></> : <><i className="fa-solid fa-cloud-arrow-up"/><strong>Drop image here</strong><span>or click to browse · PNG, JPG or WebP · max. 4 MB</span></>}
  </button>{error && <small className="form-error">{error}</small>}</div>;
}
