import * as crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const DEV_FALLBACK_KEY = "dev-only-32-char-encryption-key!";

// Production guard: require ENCRYPTION_KEY in production
if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === "production") {
  throw new Error(
    "FATAL: ENCRYPTION_KEY environment variable is required in production. " +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  );
}

if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV !== "test") {
  console.warn(
    "[encryption] WARNING: ENCRYPTION_KEY not set — using development fallback. " +
      "Set ENCRYPTION_KEY in production.",
  );
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEV_FALLBACK_KEY;

/**
 * Check if a value appears to be already encrypted (iv:ciphertext hex format)
 */
export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const colonIndex = text.indexOf(":");
  if (colonIndex !== 32) return false;
  return /^[0-9a-f]{32}:[0-9a-f]+$/.test(text);
}

/**
 * Encrypt a string value using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return text;

  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt an encrypted string
 */
export function decrypt(text: string): string {
  if (!text) return text;

  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = parts.join(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Safely decrypt a value — returns the original if it's not encrypted (backward compat)
 */
export function safeDecrypt(text: string): string {
  if (!text) return text;
  if (!isEncrypted(text)) return text;
  try {
    return decrypt(text);
  } catch {
    return text;
  }
}

/**
 * Encrypt a value only if it's not already encrypted
 */
export function safeEncrypt(text: string): string {
  if (!text) return text;
  if (isEncrypted(text)) return text;
  return encrypt(text);
}

/**
 * Encrypt tenant ID for OAuth state parameter
 */
export function encryptState(tenantId: string): string {
  const timestamp = Date.now().toString();
  const data = `${tenantId}:${timestamp}`;
  return encrypt(data);
}

/**
 * Decrypt and validate OAuth state parameter
 */
export function decryptState(encryptedState: string): {
  tenantId: string;
  timestamp: number;
} | null {
  try {
    const decrypted = decrypt(encryptedState);
    const [tenantId, timestampStr] = decrypted.split(":");
    const timestamp = parseInt(timestampStr, 10);

    // Validate timestamp (max 10 minutes old)
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    if (now - timestamp > maxAge) {
      return null;
    }

    return { tenantId, timestamp };
  } catch (error) {
    return null;
  }
}
