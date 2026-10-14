# HUMAS Inbox

Read-only view of the HUMAS WhatsApp bot's conversations (repo `FadhieZzen13/humas-bot`, FR-29/FR-30 there), at `/humas-inbox` in the sidebar.

- **Who:** HUMAS division members and dashboard admins. The sidebar link is hidden for others, and the `humas-inbox` Edge Function re-checks the member's division on every request.
- **Unlock:** the member's own dashboard password, checked by the function, which then signs a 12h session with `CHAT_SESSION_SECRET`. That's the same session as the AI assistant, so unlocking one unlocks the other.
- **Data:** `humas_contacts`, `humas_messages`, `humas_handoffs`. These are private tables (service role only), so the browser never reads them directly. Only the last 30 days are shown, the same as the bot's retention.
- **Refresh:** every 15s.
- **Not here:** replying. Admins reply from the HUMAS phone and end the chat with `#selesai`.

Files: `supabase/functions/humas-inbox/` (function + tests), `src/hooks/useHumasInbox.ts`, `src/pages/HumasInboxPage.tsx`.
