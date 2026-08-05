// Supabase Storage. Talked to over its REST API with fetch rather than
// @supabase/supabase-js — the only calls we need are upload / sign / delete,
// and that keeps the dependency out.
//
// "kyc" and "proofs" are private and only ever readable through a signed URL;
// "avatars" is public, because a profile picture is shown to anyone browsing
// the roster and a URL that expires would break the moment it was cached.
//
// The service-role key bypasses every row-level policy, so nothing in here
// may ever be imported from a client component — server actions and route
// handlers only.
export type StorageBucket = "kyc" | "proofs" | "avatars";
const BUCKET: StorageBucket = "kyc";

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

export async function uploadPrivateFile(path: string, file: File, bucket: StorageBucket = BUCKET): Promise<string> {
  const { base, key } = config();

  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Only JPG, PNG, WEBP or PDF files are accepted.");
  if (file.size > MAX_BYTES) throw new Error("That file is larger than 8 MB.");

  const res = await fetch(`${base}/object/${bucket}/${path}`, {
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

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Stores a profile picture and hands back the URL it is served from.
 *
 * Pictures used to be canvas-shrunk to a 192px square and kept as a data URL
 * in the avatarUrl column, which put a hard ceiling on quality: the roster
 * card draws the picture nearly full height, and a 192px thumbnail stretched
 * that far looks exactly as bad as it sounds. Real files go to the bucket at
 * full display resolution instead, and the row keeps only the URL.
 *
 * The path is the account id, so re-uploading replaces the old picture rather
 * than leaving it orphaned in the bucket. Callers get a cache-busting query
 * on the URL for that reason.
 */
export async function uploadPublicImage(
  path: string,
  data: ArrayBuffer,
  contentType: string,
  bucket: StorageBucket = "avatars",
): Promise<string> {
  const { base, key } = config();

  if (!IMAGE_TYPES.has(contentType)) throw new Error("Only JPG, PNG or WEBP images are accepted.");
  if (data.byteLength > MAX_IMAGE_BYTES) throw new Error("That image is larger than 4 MB.");

  const res = await fetch(`${base}/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
      "x-upsert": "true",
    },
    body: data,
  });

  if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
  return `${base}/object/public/${bucket}/${path}`;
}

/** Short-lived read URL. Defaults to a minute — long enough to render, too short to share. */
export async function createSignedUrl(path: string, expiresIn = 60, bucket: StorageBucket = BUCKET): Promise<string> {
  const { base, key } = config();

  const res = await fetch(`${base}/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });

  if (!res.ok) throw new Error(`Couldn't sign that document (${res.status}).`);
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${base}${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
}

export async function deletePrivateFile(path: string, bucket: StorageBucket = BUCKET): Promise<void> {
  const { base, key } = config();
  await fetch(`${base}/object/${bucket}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });
}
