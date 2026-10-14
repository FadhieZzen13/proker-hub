// Supabase Edge Function: HUMAS Inbox for the PPI dashboard (read-only, HUMAS + admins).
// Uses CHAT_SESSION_SECRET (same member sessions as ppi-assistant) and CHAT_ADMIN_MEMBER_IDS.
import { handle } from "./core.ts";
import { restDb } from "../ppi-assistant/db.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const DEFAULT_ADMINS = "0974c7ac-a1b6-4a01-9016-6b56fc573d05"; // Fadhie Zen

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  const sessionSecret = Deno.env.get("CHAT_SESSION_SECRET") ?? "";
  if (!sessionSecret) return json(503, { error: "Belum dikonfigurasi (CHAT_SESSION_SECRET)." });
  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON." });
  }
  try {
    const res = await handle(input, {
      db: restDb(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
      now: () => new Date(),
      sessionSecret,
      adminIds: (Deno.env.get("CHAT_ADMIN_MEMBER_IDS") ?? DEFAULT_ADMINS).split(",").map((s) => s.trim()).filter(Boolean),
    });
    return json(res.status, res.body);
  } catch (e) {
    console.error("humas-inbox:", e);
    return json(502, { error: "Gagal memuat inbox. Coba lagi." });
  }
});
