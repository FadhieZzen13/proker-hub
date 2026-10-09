// Issues one-time signed upload URLs for the `site-images` bucket, admins only.
// Pure logic with injected fetch so it can be tested without Supabase.

export const BUCKET = "site-images";
export const FOLDERS = ["kabinet", "divisions", "latest", "members", "prokers"] as const;
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export interface Env {
  supabaseUrl: string;
  serviceKey: string;
}

export interface Result {
  status: number;
  body: Record<string, unknown>;
}

const err = (status: number, error: string): Result => ({ status, body: { error } });

export async function handle(input: Record<string, unknown>, env: Env, fetchImpl: typeof fetch = fetch): Promise<Result> {
  const base = env.supabaseUrl.replace(/\/$/, "");
  const headers = { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, "Content-Type": "application/json" };

  // 1. Website-admin password, checked by the database (same as the Public Website page).
  const secret = typeof input.adminSecret === "string" ? input.adminSecret : "";
  if (!secret) return err(401, "Password admin salah.");
  const check = await fetchImpl(`${base}/rest/v1/rpc/site_admin_ok`, { method: "POST", headers, body: JSON.stringify({ secret }) });
  if (!check.ok || (await check.json()) !== true) return err(401, "Password admin salah.");

  // 2. Only known folders and image types; the server picks the file name.
  const folder = String(input.folder ?? "");
  const ext = String(input.ext ?? "").toLowerCase();
  if (!(FOLDERS as readonly string[]).includes(folder)) return err(400, "Folder tidak valid.");
  if (!TYPES[ext]) return err(400, "Hanya JPG, PNG, atau WebP.");
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  // 3. One-time signed upload URL from Storage.
  const res = await fetchImpl(`${base}/storage/v1/object/upload/sign/${BUCKET}/${path}`, { method: "POST", headers, body: "{}" });
  if (!res.ok) return err(502, `Storage: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const signed = (await res.json()) as { url?: string };
  const token = signed.url ? new URL(signed.url, base).searchParams.get("token") : null;
  if (!token) return err(502, "Storage tidak mengembalikan token upload.");

  return {
    status: 200,
    body: { bucket: BUCKET, path, token, contentType: TYPES[ext], publicUrl: `${base}/storage/v1/object/public/${BUCKET}/${path}` },
  };
}
