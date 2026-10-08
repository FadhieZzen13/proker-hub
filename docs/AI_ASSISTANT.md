# PPI Assistant (AI chatbot)

A chat assistant in the dashboard (bottom-right button, members only) that answers questions about PPI UPM and can manage prokers and the member's own monthly tracker. Admins review it on **sidebar → AI Monitor**.

## How it's built

```
AssistantWidget (browser) ──POST──▶ Supabase Edge Function `ppi-assistant` ──▶ Kimi (rootsys.cloud, OpenAI-compatible)
   holds only a signed session            holds the API key + service-role key
                                          enforces every permission
```

- **The API key never reaches the browser.** It is a Supabase secret read by the Edge Function.
- **Identity:** the dashboard's normal login is client-side only, so the assistant asks the member for their password once per browser session. The function checks it against `members.password_hash` and returns an HMAC-signed session (12 h). A client cannot claim to be someone else.
- **Guardrails:**
  1. Every message first goes through a topic check (a short, strict classifier call). Anything not about PPI UPM gets a fixed refusal and never reaches the main model. If the check's reply can't be parsed, the message is blocked.
  2. The main system prompt restricts scope again, and tells the model to confirm changes with the user before calling a write tool.
  3. Clients can't inject system or tool messages; only user/assistant text is accepted, trimmed to the last 12 turns.
  4. Rate limit: `CHAT_HOURLY_LIMIT` messages per member per hour (default 40) to protect the API budget.
- **Permissions (server-side, whatever the model says):**
  | Who | Prokers | Monthly tracker |
  |---|---|---|
  | BPH (any position) | create / update / delete any division's | own entries |
  | Kadep / Wakadep | create / update / delete prokers **owned** by their division (collab prokers of other divisions are read-only; can't move a proker to another division) | own entries |
  | Everyone else | read only | own entries |
- **First week:** for 7 days after `CHAT_LAUNCH_DATE`, `delete_proker` does not delete. It files a request (with a snapshot of the proker) that an admin approves or rejects on AI Monitor. If `CHAT_LAUNCH_DATE` is not set, deletes always need approval.
- **No false "done":** the model's own word is never trusted. Every real change comes back as a server-made receipt shown under the reply (done / sent to admin / denied). If the model claims a change but made no tool call in that request, the server sends it back once to actually call the tool; if it still doesn't, the user sees "belum tersimpan". Kimi K2.7 is a thinking model and did this in testing.
- **Confirmation:** proker changes are confirmed with the user first; the member's own tracker entries are written directly when the request is clear.
- **Audit:** every write the assistant attempts is logged (`done`, `requested`, `denied`, `error`) and shown on AI Monitor.
- New prokers are created as drafts (`lapak_ready = false`), same as the dashboard.

Files: `supabase/functions/ppi-assistant/*` (server), `supabase/migrations/20261009000001_ai_assistant.sql`, `src/components/AssistantWidget.tsx`, `src/hooks/useAssistant.ts`, `src/pages/AdminAiMonitorPage.tsx`.

## Going live

Requires the website migrations (`20261007000001_public_site.sql`) and a website-admin password, since AI Monitor uses that password.

1. Run `supabase/migrations/20261009000001_ai_assistant.sql` in the Supabase SQL editor.
2. Install the Supabase CLI and link the project (once):
   ```
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref odahsfptgvilcytuudgx
   ```
3. Set the secrets (put your real key in place of `sk-...`; use a long random string for the session secret):
   ```
   supabase secrets set CHAT_API_KEY=sk-... CHAT_SESSION_SECRET=$(openssl rand -hex 32)
   supabase secrets set CHAT_BASE_URL=https://rootsys.cloud/v1 CHAT_MODEL=kimi-k2.7 CHAT_LAUNCH_DATE=YYYY-MM-DD
   supabase secrets set CHAT_GATE_MODEL=glm-5.3-flash   # optional: faster, cheaper model for the topic check
   ```
   Any model on rootsys.cloud works (same OpenAI-style API); just change `CHAT_MODEL`. `CHAT_GATE_MODEL` is optional: a fast non-thinking model makes the topic check quicker and cheaper.
4. Deploy: `supabase functions deploy ppi-assistant` (`verify_jwt = false` is set in `supabase/config.toml`; the function does its own auth).
5. Deploy the dashboard as usual.

Until step 3 is done, the widget shows "Asisten belum dikonfigurasi".

## Limits worth knowing

- The rest of the database is still open to anon writes (see the security note in `PUBLIC_WEBSITE.md`). The assistant's own rules are enforced, but someone with the anon key could still edit prokers directly, bypassing the assistant.
- "Confirm before changing" is a prompt instruction, not a server check; the first-week approval and the audit log are the safety net.
- Kimi's tool-calling reliability depends on the exact model; try a few create/update/delete flows with a test proker after deploying.

## Tests

- Server logic: `supabase/functions/ppi-assistant/core.test.ts`, 41 checks with an in-memory database and a scripted fake model (auth, forged tokens, topic gate, history sanitising, every permission rule, first-week delete requests, admin approve/reject, tracker ownership, rate limit).
- Widget: `src/components/AssistantWidget.test.tsx`. Run everything with `npx vitest run`.
