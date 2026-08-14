const encoder = new TextEncoder();
const CURRENT_HASH_PREFIX = "v3-hmac-sha256$";

function bytesToBase64(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

export function createSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password: string, salt: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${salt}\u0000${password}`),
  );
  return `${CURRENT_HASH_PREFIX}${bytesToBase64(new Uint8Array(signature))}`;
}

export async function verifyPassword(
  password: string,
  salt: string,
  storedHash: string,
  pepper: string,
): Promise<boolean> {
  if (!storedHash.startsWith(CURRENT_HASH_PREFIX)) return false;
  return constantTimeEqual(await hashPassword(password, salt, pepper), storedHash);
}

export function constantTimeEqual(left: string, right: string): boolean {
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
