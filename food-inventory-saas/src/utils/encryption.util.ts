import * as crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-32-char-encryption-key";
const IV_LENGTH = 16;

/**
 * Encrypt a string value
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
