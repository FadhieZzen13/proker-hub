import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";
import { uploadProkerImage } from "@/lib/siteImageUpload";
import type { ProkerPageDetails, SiteProker } from "@/hooks/useSiteAdmin";

// Public Website → Prokers can be edited two ways:
//  - website admins, with the website-admin password (database RPCs, all divisions);
//  - division editors (Kadep/Wakadep, listed BPH), with their own member session via the
//    `site-editor` Edge Function, which only accepts prokers of their divisions.
// Both look the same to the page through this interface.

export interface SiteEditor {
  saveProker(value: SiteProker): Promise<void>;
  saveDetails(prokerId: string, details: ProkerPageDetails): Promise<void>;
  /** Uploads a proker page image and returns its public URL. */
  upload?: (file: File) => Promise<string>;
  canEdit(division: string): boolean;
}

const EDITOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/site-editor`;

export class SiteEditorError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function callEditor<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(EDITOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SiteEditorError("Tidak bisa terhubung. Cek koneksi kamu.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new SiteEditorError((data as { error?: string }).error ?? `Error ${res.status}`, res.status);
  return data as T;
}

/** Website admins: everything, through the existing password-checked RPCs. */
export function useAdminSiteEditor(secret: string): SiteEditor {
  const qc = useQueryClient();
  return useMemo(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: ["site_prokers"] });
    return {
      async saveProker(p) {
        const { error } = await sb.rpc("site_admin_set_proker", {
          secret,
          p_proker_id: p.proker_id,
          p_published: p.published,
          p_title: p.public_title,
          p_description: p.public_description,
        });
        if (error) throw error;
        await refresh();
      },
      async saveDetails(prokerId, details) {
        const { error } = await sb.rpc("site_admin_set_proker_details", { secret, p_proker_id: prokerId, p_details: details });
        if (error) throw error;
        await refresh();
      },
      upload: undefined, // ImageUpload uses the admin password itself
      canEdit: () => true,
    };
  }, [secret, qc]);
}

// Same storage key as the assistant, so unlocking one also unlocks the other.
const tokenKey = (memberId: string) => `ppi_assistant_token_${memberId}`;
const readToken = (memberId?: string) => {
  try {
    return memberId ? sessionStorage.getItem(tokenKey(memberId)) : null;
  } catch {
    return null;
  }
};

/** Division editors: their own password, then only their divisions. */
export function useMemberSiteEditor(memberId: string | undefined) {
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(() => readToken(memberId));
  const [divisions, setDivisions] = useState<string[] | null>(null);
  const [checking, setChecking] = useState(!!token);

  const forget = useCallback(() => {
    if (memberId) sessionStorage.removeItem(tokenKey(memberId));
    setToken(null);
    setDivisions(null);
  }, [memberId]);

  // A stored session (e.g. from the assistant): ask the server what it may edit.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setChecking(true);
    callEditor<{ divisions: string[] }>({ action: "me", token })
      .then((r) => !cancelled && setDivisions(r.divisions))
      .catch(() => !cancelled && forget())
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [token, forget]);

  const unlock = useCallback(
    async (password: string) => {
      if (!memberId) return;
      const r = await callEditor<{ token: string; divisions: string[] }>({ action: "login", memberId, password });
      sessionStorage.setItem(tokenKey(memberId), r.token);
      setDivisions(r.divisions);
      setToken(r.token);
    },
    [memberId]
  );

  const editor = useMemo<SiteEditor | null>(() => {
    if (!token || !divisions) return null;
    const refresh = () => qc.invalidateQueries({ queryKey: ["site_prokers"] });
    const call = async (body: Record<string, unknown>) => {
      try {
        await callEditor({ ...body, token });
      } catch (e) {
        if (e instanceof SiteEditorError && e.status === 401) forget();
        throw e;
      }
      await refresh();
    };
    return {
      saveProker: (p) =>
        call({ action: "set_proker", prokerId: p.proker_id, published: p.published, title: p.public_title, description: p.public_description }),
      saveDetails: (prokerId, details) => call({ action: "set_details", prokerId, details }),
      upload: (file) => uploadProkerImage(file, token),
      canEdit: (division) => divisions.includes(division),
    };
  }, [token, divisions, qc, forget]);

  return { editor, divisions, checking, unlock, lock: forget };
}
