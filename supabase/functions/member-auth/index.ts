// Supabase Edge Function: member login (status / login / claim / register) for the PPI dashboard.
// Uses CHAT_SESSION_SECRET (same member sessions as ppi-assistant). members.password_hash is
// only reachable with the service role key; anon and authenticated can't read or write it.
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
  if (!sessionSecret) return json(503, { error: "Not configured (CHAT_SESSION_SECRET)." });
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
    });
    return json(res.status, res.body);
  } catch (e) {
    console.error("member-auth:", e);
    return json(502, { error: "Something went wrong. Try again." });
  }
});
