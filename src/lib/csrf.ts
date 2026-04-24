import { env } from "~/env";

const TTL_MS = 60 * 60 * 1000; // 1 hour
export const CSRF_HEADER = "x-csrf-token" as const;

function toBase64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.CSRF_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function generateCsrfToken(): Promise<string> {
  const ts = Date.now().toString(36);
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const payload = `${ts}.${nonce}`;
  const key = await getKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return `${payload}.${toBase64url(sig)}`;
}

export async function validateCsrfToken(
  token: string | null | undefined,
): Promise<boolean> {
  if (!token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const firstDot = payload.indexOf(".");
  if (firstDot <= 0) return false;
  const ts = parseInt(payload.slice(0, firstDot), 36);
  if (Number.isNaN(ts) || Date.now() - ts > TTL_MS) return false;
  const key = await getKey();
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64url(sig),
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}
