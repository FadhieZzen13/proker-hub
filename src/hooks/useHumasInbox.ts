import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

// HUMAS Inbox: read-only view of the HUMAS WhatsApp bot's chats, via the `humas-inbox`
// Edge Function (the humas_* tables are private). Same member session as the assistant,
// so unlocking either one unlocks both.

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/humas-inbox`;
const REFRESH_MS = 15_000;

export interface InboxChat {
  jid: string;
  name: string | null;
  phone: string | null;
  mode: "bot" | "human";
  lastCategory: number | null;
  lastActivityAt: string;
  lastMessage: { body: string; direction: "in" | "bot" | "admin"; at: string } | null;
  messagesIn: number;
  handoff: { requestedAt: string; answered: boolean; open: boolean } | null;
}

export interface InboxMessage {
  body: string;
  direction: "in" | "bot" | "admin";
  category: number | null;
  off_hours: boolean;
  backlog: boolean;
  created_at: string;
}

export class InboxError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new InboxError("Tidak bisa terhubung. Cek koneksi kamu.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new InboxError((data as { error?: string }).error ?? `Error ${res.status}`, res.status);
  return data as T;
}

// The assistant saves this key JSON-encoded; accept both forms.
const tokenKey = (memberId: string) => `ppi_assistant_token_${memberId}`;
function readToken(memberId?: string): string | null {
  if (!memberId) return null;
  try {
    const raw = sessionStorage.getItem(tokenKey(memberId));
    if (!raw) return null;
    return raw.startsWith('"') ? (JSON.parse(raw) as string) : raw;
  } catch {
    return null;
  }
}

export function useHumasInbox(memberId: string | undefined, selectedJid: string | null) {
  const [token, setToken] = useState<string | null>(() => readToken(memberId));

  const lock = useCallback(() => {
    // only forget the session here if it's ours to forget; the assistant shares it
    setToken(null);
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      if (!memberId) return;
      const r = await call<{ token: string }>({ action: "login", memberId, password });
      sessionStorage.setItem(tokenKey(memberId), JSON.stringify(r.token));
      setToken(r.token);
    },
    [memberId]
  );

  const onAuthError = (e: unknown) => {
    if (e instanceof InboxError && (e.status === 401 || e.status === 403)) setToken(null);
  };

  const chats = useQuery({
    queryKey: ["humas_inbox_chats", token],
    enabled: !!token,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      try {
        return (await call<{ chats: InboxChat[] }>({ action: "chats", token })).chats;
      } catch (e) {
        onAuthError(e);
        throw e;
      }
    },
  });

  const messages = useQuery({
    queryKey: ["humas_inbox_messages", token, selectedJid],
    enabled: !!token && !!selectedJid,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      try {
        return (await call<{ messages: InboxMessage[] }>({ action: "messages", token, jid: selectedJid })).messages;
      } catch (e) {
        onAuthError(e);
        throw e;
      }
    },
  });

  return { token, unlock, lock, chats, messages };
}
