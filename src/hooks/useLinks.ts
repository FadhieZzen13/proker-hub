import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";

export interface AppLink {
  id: string;
  label: string;
  url: string;
  description: string;
  restricted: boolean;
  sort: number;
  created_at: string;
}

export type AppLinkInsert = {
  label?: string;
  url?: string;
  description?: string;
  restricted?: boolean;
  sort?: number;
};

export function useLinks() {
  return useQuery({
    queryKey: ["app_links"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("app_links")
        .select("*")
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AppLink[];
    },
  });
}

export function useAddLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: AppLinkInsert) => {
      const { error } = await sb.from("app_links").insert(link);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_links"] }),
  });
}

export function useUpdateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: AppLinkInsert & { id: string }) => {
      const { error } = await sb.from("app_links").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_links"] }),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("app_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_links"] }),
  });
}
