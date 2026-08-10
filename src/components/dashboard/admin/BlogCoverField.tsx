"use client";

import { useState } from "react";

export function BlogCoverField() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
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
  return <div className="admin-blog-cover"><input type="hidden" name="coverImageUrl" value={value}/><label><span>Title image {uploading && <small>uploading…</small>}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={event => void pick(event.target.files?.[0])}/></label>{error && <small className="form-error">{error}</small>}{value && <img src={value} alt="Title image preview"/>}</div>;
}
