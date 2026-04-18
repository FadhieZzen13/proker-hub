import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OngoingComment {
  id: string;
  proker_id: string;
  commenter_name: string;
  commenter_division: string | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

export function useOngoingComments(prokerId: string) {
  return useQuery({
    queryKey: ["ongoing_comments", prokerId],
    queryFn: async () => {
      if (!prokerId) return [];
      const { data, error } = await supabase
        .from("ongoing_comments")
        .select("*")
        .eq("proker_id", prokerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OngoingComment[];
    },
    enabled: !!prokerId,
  });
}

export function useAddOngoingComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<OngoingComment, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("ongoing_comments")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as OngoingComment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ongoing_comments", data.proker_id] });
    },
  });
}

export function useDeleteOngoingComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prokerId }: { id: string; prokerId: string }) => {
      const { error } = await supabase.from("ongoing_comments").delete().eq("id", id);
      if (error) throw error;
      return prokerId;
    },
    onSuccess: (prokerId) => {
      qc.invalidateQueries({ queryKey: ["ongoing_comments", prokerId] });
    },
  });
}
