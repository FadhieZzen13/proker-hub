// Supabase Edge Function: Public Website → Prokers for division editors (see core.ts).
// Uses CHAT_SESSION_SECRET (same member sessions as ppi-assistant); SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY come from the platform.

import { handle } from "./core.ts";
import { restDb } from "../ppi-assistant/db.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  const sessionSecret = Deno.env.get("CHAT_SESSION_SECRET") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!sessionSecret) return json(503, { error: "Belum dikonfigurasi (CHAT_SESSION_SECRET)." });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON." });
  }
  try {
    const res = await handle(input, {
      db: restDb(supabaseUrl, serviceKey),
      now: () => new Date(),
      sessionSecret,
      upload: { supabaseUrl, serviceKey },
    });
    return json(res.status, res.body);
  } catch (e) {
    console.error("site-editor:", e);
    return json(502, { error: "Gagal menyimpan. Coba lagi." });
  }
});
