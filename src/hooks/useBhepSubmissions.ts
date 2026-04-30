import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BhepSubmission = {
  id: string;
  submission_date: string;
  link: string;
  created_at: string;
};

export function useBhepSubmissions() {
  return useQuery({
    queryKey: ["bhep-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bhep_submissions")
        .select("*")
        .order("submission_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BhepSubmission[];
    },
  });
}

export function useAddBhepSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ submission_date, link }: { submission_date: string; link: string }) => {
      const { data, error } = await supabase
        .from("bhep_submissions")
        .insert({ submission_date, link })
        .select("*")
        .single();
      if (error) throw error;
      return data as BhepSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bhep-submissions"] });
    },
  });
}

export function useUpdateBhepSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, submission_date, link }: { id: string; submission_date: string; link: string }) => {
      const { error } = await supabase
        .from("bhep_submissions")
        .update({ submission_date, link })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bhep-submissions"] });
    },
  });
}

export function useDeleteBhepSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("bhep_submissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bhep-submissions"] });
    },
  });
}
