import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";

export interface RabComment {
  id: string;
  proker_id: string;
  /** NULL = a comment on the RAB as a whole (per-line comments are not wired up yet). */
  rab_id: string | null;
  commenter_name: string;
  commenter_division: string | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

export function useRabComments(prokerId: string) {
  return useQuery({
    queryKey: ["lapak_rab_comments", prokerId],
    enabled: !!prokerId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lapak_rab_comments")
        .select("*")
        .eq("proker_id", prokerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RabComment[];
    },
  });
}

export function useAddRabComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<RabComment, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await sb
        .from("lapak_rab_comments")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as RabComment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lapak_rab_comments", data.proker_id] });
    },
  });
}

export function useDeleteRabComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prokerId }: { id: string; prokerId: string }) => {
      const { error } = await sb.from("lapak_rab_comments").delete().eq("id", id);
      if (error) throw error;
      return prokerId;
    },
    onSuccess: (prokerId) => {
      qc.invalidateQueries({ queryKey: ["lapak_rab_comments", prokerId] });
    },
  });
}
