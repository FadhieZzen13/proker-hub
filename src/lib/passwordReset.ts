// Client for the `password-reset` Edge Function (admin-approved resets).
// Admin calls reuse the shared member session (same key as the assistant and HUMAS Inbox).

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-reset`;

export class ResetError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function resetCall<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ResetError("Can't connect. Check your connection.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ResetError((data as { error?: string }).error ?? `Error ${res.status}`, res.status);
  return data as T;
}

export const resetLink = (token: string) => `${window.location.origin}/reset-password?token=${encodeURIComponent(token)}`;
