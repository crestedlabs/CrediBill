/**
 * Encryption Utilities
 * Simple AES-256-GCM encryption for storing payment provider credentials
 *
 * IMPORTANT: In production, use environment variables for encryption keys
 * and consider using a proper key management service (KMS)
 */

/**
 * Encrypt a string using AES-256-GCM
 * Returns base64-encoded encrypted data with IV prepended
 */
export async function encryptString(
  plaintext: string,
  key: string
): Promise<string> {
  // In Node.js environment (Convex backend)
  if (typeof window === "undefined") {
    const crypto = await import("crypto");

    // Derive a 32-byte key from the provided key string
    const keyBuffer = crypto.createHash("sha256").update(key).digest();

    // Generate random IV
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV + AuthTag + Encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, "base64"),
    ]);

    return combined.toString("base64");
  }

  // Browser environment (for UI)
  throw new Error("Encryption should only be done on the server");
}

/**
 * Decrypt an AES-256-GCM encrypted string
 * Expects base64-encoded data with IV prepended
 */
export async function decryptString(
  encrypted: string,
  key: string
): Promise<string> {
  // In Node.js environment (Convex backend)
  if (typeof window === "undefined") {
    const crypto = await import("crypto");

    // Derive the same 32-byte key
    const keyBuffer = crypto.createHash("sha256").update(key).digest();

    // Decode the combined data
    const combined = Buffer.from(encrypted, "base64");

    // Extract IV (first 16 bytes), AuthTag (next 16 bytes), and encrypted data
    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encryptedData = combined.subarray(32);

    // Create decipher
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(
      encryptedData.toString("base64"),
      "base64",
      "utf8"
    );
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  // Browser environment
  throw new Error("Decryption should only be done on the server");
}

/**
 * Generate a random encryption key
 * Use this to generate your master encryption key
 */
export function generateEncryptionKey(): string {
  if (typeof window === "undefined") {
    const crypto = require("crypto");
    return crypto.randomBytes(32).toString("hex");
  }
  throw new Error("Key generation should only be done on the server");
}

/**
 * Hash a string using SHA-256
 * Useful for storing API key hashes
 */
export async function hashString(input: string): Promise<string> {
  if (typeof window === "undefined") {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  // Browser environment using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
