// Supabase Edge Function: PPI UPM assistant.
//
// Secrets (supabase secrets set ...):
//   CHAT_API_KEY         API key for the model provider (never sent to the browser)
//   CHAT_SESSION_SECRET  random string used to sign member sessions
//   CHAT_BASE_URL        default https://rootsys.cloud/v1
//   CHAT_MODEL           model id for the conversation, e.g. kimi-k2.7
//   CHAT_GATE_MODEL      optional faster model for the topic check, e.g. glm-5.3-flash (defaults to CHAT_MODEL)
//   CHAT_LAUNCH_DATE     YYYY-MM-DD go-live day; proker deletes need admin approval for 7 days after it
//   CHAT_HOURLY_LIMIT    messages per member per hour (default 40; admins unlimited)
//   CHAT_ADMIN_MEMBER_IDS comma-separated member ids with admin privileges (default: Fadhie Zen)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { handle } from "./core.ts";
import { restDb } from "./db.ts";
import { openAiCompatible } from "./llm.ts";

const env = (k: string, fallback = "") => Deno.env.get(k) ?? fallback;
// Keep in sync with ADMIN_MEMBER_IDS in src/lib/roles.ts.
const DEFAULT_ADMINS = "0974c7ac-a1b6-4a01-9016-6b56fc573d05"; // Fadhie Zen

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

  const apiKey = env("CHAT_API_KEY");
  const sessionSecret = env("CHAT_SESSION_SECRET");
  if (!apiKey || !sessionSecret) return json(503, { error: "Asisten belum dikonfigurasi (API key / session secret belum diisi)." });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON." });
  }

  const baseUrl = env("CHAT_BASE_URL", "https://rootsys.cloud/v1");
  const model = env("CHAT_MODEL", "kimi-k2.7");
  const gateModel = env("CHAT_GATE_MODEL");

  try {
    const res = await handle(input, {
      db: restDb(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")),
      llm: openAiCompatible(baseUrl, apiKey, model),
      gateLlm: gateModel && gateModel !== model ? openAiCompatible(baseUrl, apiKey, gateModel) : undefined,
      now: () => new Date(),
      config: {
        sessionSecret,
        launchDate: env("CHAT_LAUNCH_DATE") || null,
        hourlyLimit: Number(env("CHAT_HOURLY_LIMIT", "40")) || 40,
        adminIds: env("CHAT_ADMIN_MEMBER_IDS", DEFAULT_ADMINS).split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    return json(res.status, res.body);
  } catch (e) {
    console.error("ppi-assistant:", e);
    return json(502, { error: "Asisten sedang bermasalah. Coba lagi sebentar lagi." });
  }
});
