// Member identity for the assistant.
//
// The dashboard only checks passwords in the browser, so the assistant cannot trust a
// member id sent by the client. Instead the member re-enters their password once; we
// verify it here against members.password_hash (same salted SHA-256 as
// src/lib/password.ts) and hand back an HMAC-signed session token.

const SALT = "ppi-upm-2025/26"; // must match src/lib/password.ts
const enc = new TextEncoder();

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function hashPassword(password: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(SALT + password)));
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash || !password) return false;
  return safeEqual(await hashPassword(password), storedHash);
}

export interface SessionPayload {
  mid: string; // member id
  exp: number; // unix seconds
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined, secret: string, nowSeconds: number): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload;
    if (typeof payload.mid !== "string" || typeof payload.exp !== "number" || payload.exp < nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}
