// Lightweight password hashing for the member login gate.
//
// NOTE: this is "good enough to stop casual impersonation", NOT real security.
// The app talks to Supabase with an anonymous key and open RLS, so there is no
// server-side secret. We salt + SHA-256 the password in the browser so plaintext
// is never stored, and we only ever fetch a single member's hash at login time.
const SALT = "ppi-upm-2025/26";

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyHash(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return (await hashPassword(password)) === hash;
}
