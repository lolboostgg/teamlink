import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export type TwoFactorRecord = { enabled: true; secret: string };

function encryptionKey() {
  return createHash("sha256").update(process.env.AUTH_SECRET ?? "teamlink-development-secret").digest();
}

export function createTwoFactorSecret() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) output += ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  return output;
}

function decodeBase32(secret: string) {
  let bits = "";
  for (const character of secret.replace(/=+$/g, "").toUpperCase()) {
    const value = ALPHABET.indexOf(character);
    if (value >= 0) bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function codeFor(secret: string, counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

export function verifyTwoFactorCode(secret: string, value: string) {
  const supplied = value.replace(/\s/g, "");
  if (!/^\d{6}$/.test(supplied)) return false;
  const counter = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((offset) => timingSafeEqual(Buffer.from(codeFor(secret, counter + offset)), Buffer.from(supplied)));
}

export function encryptTwoFactorSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString("base64url")).join(".");
}

export function decryptTwoFactorSecret(value: string) {
  try {
    const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function readTwoFactor(raw: unknown): TwoFactorRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const security = (raw as Record<string, unknown>)._security;
  if (!security || typeof security !== "object") return null;
  const value = security as Record<string, unknown>;
  return value.twoFactorEnabled === true && typeof value.twoFactorSecret === "string"
    ? { enabled: true, secret: value.twoFactorSecret }
    : null;
}
