import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";
import type { SiteContent } from "@/lib/siteContent";

// The website-admin password is checked by the database (site_admin_ok), not in the
// browser. We keep it for this tab only so each save can pass it along.
const SECRET_KEY = "ppi_site_admin_secret";

export function useSiteAdminSecret() {
  const [secret, setSecretState] = useState<string | null>(() => sessionStorage.getItem(SECRET_KEY));

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const { data, error } = await sb.rpc("site_admin_ok", { secret: password });
    if (error) throw error;
    if (!data) return false;
    sessionStorage.setItem(SECRET_KEY, password);
    setSecretState(password);
    return true;
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(SECRET_KEY);
    setSecretState(null);
  }, []);

  return { secret, unlock, lock };
}

export interface SiteProker {
  proker_id: string;
  published: boolean;
  public_title: string;
  public_description: string;
}

export function useSiteProkers() {
  return useQuery({
    queryKey: ["site_prokers"],
    queryFn: async (): Promise<SiteProker[]> => {
      const { data, error } = await sb.from("site_prokers").select("proker_id,published,public_title,public_description");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetSiteProker(secret: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: SiteProker) => {
      const { error } = await sb.rpc("site_admin_set_proker", {
        secret,
        p_proker_id: p.proker_id,
        p_published: p.published,
        p_title: p.public_title,
        p_description: p.public_description,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_prokers"] }),
  });
}

export function useSiteContent() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async (): Promise<SiteContent> => {
      const { data, error } = await sb.from("site_settings").select("content").eq("id", 1).maybeSingle();
      if (error) throw error;
      return (data?.content as SiteContent) ?? {};
    },
  });
}

export function useSaveSiteContent(secret: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: SiteContent) => {
      const { error } = await sb.rpc("site_admin_save_content", { secret, new_content: content });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_settings"] }),
  });
}
