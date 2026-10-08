// Supabase Edge Function: signed image uploads for the Public Website admin page.
// Needs no extra secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { handle } from "./core.ts";

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

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON." });
  }
  try {
    const res = await handle(input, {
      supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    });
    return json(res.status, res.body);
  } catch (e) {
    console.error("site-upload:", e);
    return json(502, { error: "Upload gagal. Coba lagi." });
  }
});
