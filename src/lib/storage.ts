// Private Supabase Storage bucket for identity documents. Talked to over its
// REST API with fetch rather than @supabase/supabase-js — the only calls we
// need are upload / sign / delete, and that keeps the dependency out.
//
// The service-role key bypasses every row-level policy, so nothing in here
// may ever be imported from a client component — server actions and route
// handlers only.
const BUCKET = "kyc";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Document storage isn't configured — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing.");
  }
  return { base: `${url.replace(/\/$/, "")}/storage/v1`, key };
}

/** True when the bucket credentials exist — lets the UI explain itself instead of throwing. */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function uploadPrivateFile(path: string, file: File): Promise<string> {
  const { base, key } = config();

  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Only JPG, PNG, WEBP or PDF files are accepted.");
  if (file.size > MAX_BYTES) throw new Error("That file is larger than 8 MB.");

  const res = await fetch(`${base}/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type,
      // Overwrite whatever sat at this path before — a resubmitted document
      // replaces the old one instead of piling up orphans.
      "x-upsert": "true",
    },
    body: await file.arrayBuffer(),
  });

  if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
  return path;
}

/** Short-lived read URL. Defaults to a minute — long enough to render, too short to share. */
export async function createSignedUrl(path: string, expiresIn = 60): Promise<string> {
  const { base, key } = config();

  const res = await fetch(`${base}/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });

  if (!res.ok) throw new Error(`Couldn't sign that document (${res.status}).`);
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${base}${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
}

export async function deletePrivateFile(path: string): Promise<void> {
  const { base, key } = config();
  await fetch(`${base}/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });
}
