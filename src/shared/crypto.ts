// ─── KnightClaw Crypto Utilities ─────────────────────────────────────────────
// All crypto uses Node built-in `node:crypto`. Zero external dependencies.
// NO custom crypto algorithms — only battle-tested standards.

import {
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
  timingSafeEqual,
} from "node:crypto";

// ─── Hashing ─────────────────────────────────────────────────────────────────

/** SHA-256 hash of a string — used for hash chains and content hashing */
export function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/** HMAC-SHA256 — used for log signing */
export function hmacSha256(data: string, key: string): string {
  return createHmac("sha256", key).update(data, "utf8").digest("hex");
}

/** Hash sensitive data for logging (never log plaintext secrets) */
export function redact(value: string): string {
  if (!value || value.length === 0) return "[empty]";
  const hash = sha256(value).slice(0, 12);
  return `[redacted:${hash}]`;
}

// ─── Encryption (AES-256-GCM) ────────────────────────────────────────────────

const AES_KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/** Derive an encryption key from a password using PBKDF2 */
export function deriveKey(
  password: string,
  salt: Buffer,
  iterations: number = 600_000,
): Buffer {
  return pbkdf2Sync(password, salt, iterations, AES_KEY_LENGTH, "sha512");
}

/** Encrypt plaintext with AES-256-GCM. Returns `salt:iv:authTag:ciphertext` (hex) */
export function encrypt(plaintext: string, password: string): string {
  const salt = randomBytes(32);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return [
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted,
  ].join(":");
}

/** Decrypt AES-256-GCM ciphertext. Input format: `salt:iv:authTag:ciphertext` (hex) */
export function decrypt(encryptedData: string, password: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }

  const [saltHex, ivHex, authTagHex, ciphertext] = parts;
  const salt = Buffer.from(saltHex!, "hex");
  const iv = Buffer.from(ivHex!, "hex");
  const authTag = Buffer.from(authTagHex!, "hex");
  const key = deriveKey(password, salt);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext!, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── Comparison ──────────────────────────────────────────────────────────────

/**
 * Constant-time string comparison that does NOT leak length.
 * Both inputs are hashed to fixed-length digests before comparison.
 * Fixes MED-01 from the vulnerability audit.
 */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

// ─── Random ──────────────────────────────────────────────────────────────────

/** Generate a cryptographically random hex string */
export function randomHex(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** Generate a random ID suitable for log entries */
export function randomId(): string {
  return randomBytes(16).toString("hex");
}
