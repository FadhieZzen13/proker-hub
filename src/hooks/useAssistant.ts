import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Talks to the `ppi-assistant` Supabase Edge Function. The model API key lives only in
// that function; the browser just holds a short-lived signed session token.
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ppi-assistant`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export class AssistantError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function callAssistant<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: PUBLISHABLE_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AssistantError("Tidak bisa terhubung ke asisten. Cek koneksi kamu.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AssistantError((data as { error?: string }).error ?? `Error ${res.status}`, res.status);
  return data as T;
}

/** What the server actually did during a reply (not the model's own claim). */
export interface ActionReceipt {
  tool: string;
  outcome: "done" | "requested" | "denied" | "error";
  label: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  blocked?: boolean;
  actions?: ActionReceipt[];
}

const tokenKey = (memberId: string) => `ppi_assistant_token_${memberId}`;
const historyKey = (memberId: string) => `ppi_assistant_history_${memberId}`;
const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Session + chat history for one member, kept for this browser tab only. */
export function useAssistant(memberId: string | undefined) {
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    setToken(read<string | null>(tokenKey(memberId), null));
    setTurns(read<ChatTurn[]>(historyKey(memberId), []));
  }, [memberId]);

  useEffect(() => {
    if (memberId) sessionStorage.setItem(historyKey(memberId), JSON.stringify(turns.slice(-40)));
  }, [memberId, turns]);

  const unlock = useCallback(
    async (password: string) => {
      if (!memberId) return;
      setError(null);
      setBusy(true);
      try {
        const res = await callAssistant<{ token: string }>({ action: "login", memberId, password });
        sessionStorage.setItem(tokenKey(memberId), JSON.stringify(res.token));
        setToken(res.token);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [memberId]
  );

  const send = useCallback(
    async (text: string) => {
      if (!memberId || !token || !text.trim()) return;
      const next: ChatTurn[] = [...turns, { role: "user", content: text.trim() }];
      setTurns(next);
      setError(null);
      setBusy(true);
      try {
        const res = await callAssistant<{ reply: string; blocked?: boolean; changed?: string[]; actions?: ActionReceipt[] }>({
          action: "chat",
          token,
          // Blocked exchanges are not sent back as context.
          messages: next.filter((t) => !t.blocked).map(({ role, content }) => ({ role, content })),
        });
        setTurns((t) => [...t, { role: "assistant", content: res.reply, blocked: res.blocked, actions: res.actions?.length ? res.actions : undefined }]);
        if (res.blocked) setTurns((t) => t.map((turn, i) => (i === t.length - 2 ? { ...turn, blocked: true } : turn)));
        // Proker data spans many queries (Lapak Kerja, RAB, logs, comments...): refresh them all.
        if (res.changed?.includes("prokers")) qc.invalidateQueries();
        if (res.changed?.includes("tracker")) {
          qc.invalidateQueries({ queryKey: ["tracker_entries"] });
          qc.invalidateQueries({ queryKey: ["tracker_entries_month"] });
        }
      } catch (e) {
        if (e instanceof AssistantError && e.status === 401) {
          sessionStorage.removeItem(tokenKey(memberId));
          setToken(null);
        }
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [memberId, token, turns, qc]
  );

  const reset = useCallback(() => setTurns([]), []);

  return { token, turns, busy, error, unlock, send, reset };
}
