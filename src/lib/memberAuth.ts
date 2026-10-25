// Client for the `member-auth` Edge Function. Password hashes stay on the server;
// the browser only sends the password and gets back a member session token.

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-auth`;

export class MemberAuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function memberAuthCall<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new MemberAuthError("Can't connect. Check your connection.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new MemberAuthError((data as { error?: string }).error ?? `Error ${res.status}`, res.status);
  return data as T;
}

// Same key (JSON-encoded) the assistant and HUMAS Inbox read, so they don't ask for the password again.
export function saveMemberSession(memberId: string, token: string) {
  try {
    sessionStorage.setItem(`ppi_assistant_token_${memberId}`, JSON.stringify(token));
  } catch {
    // storage blocked: those pages will just ask for the password
  }
}
