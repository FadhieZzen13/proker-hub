import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BerkelanjutanCategory = "finance" | "response" | "outreach" | "people" | "training";

export interface BerkelanjutanEntry {
  id: string;
  proker_id: string;
  entry_date: string;
  // finance
  targeted_income: number | null;
  actual_income: number | null;
  // response
  messages_per_day: number | null;
  messages_replied_per_day: number | null;
  response_time_minutes: number | null;
  // outreach
  posts_count: number | null;
  total_reach: number | null;
  new_followers: number | null;
  content_notes: string | null;
  // people
  meals_bought: number | null;
  meals_given_out: number | null;
  attendees: number | null;
  location: string | null;
  school_visited: string | null;
  participants_count: number | null;
  ppi_members_attendance: number | null;
  visit_datetime: string | null;
  // training / seminar
  topic: string | null;
  speaker: string | null;
  target_audience: number | null;
  actual_audience: number | null;
  duration_minutes: number | null;
  satisfaction_score: number | null;
  training_notes: string | null;
  // shared
  notes: string | null;
  created_at: string;
}

export type BerkelanjutanInsert = Omit<BerkelanjutanEntry, "id" | "created_at"> & { id?: string };

export function useBerkelanjutanEntries(prokerId: string) {
  return useQuery({
    queryKey: ["berkelanjutan_entries", prokerId],
    queryFn: async () => {
      if (!prokerId) return [];
      const { data, error } = await supabase
        .from("berkelanjutan_entries")
        .select("*")
        .eq("proker_id", prokerId)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BerkelanjutanEntry[];
    },
    enabled: !!prokerId,
  });
}

export function useAddBerkelanjutanEntry() {
  const qc = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (entry: BerkelanjutanInsert) => {
      const { error } = await supabase
        .from("berkelanjutan_entries")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(entry as any);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["berkelanjutan_entries", variables.proker_id] });
    },
  });
}

export function useDeleteBerkelanjutanEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, proker_id }: { id: string; proker_id: string }) => {
      const { error } = await supabase
        .from("berkelanjutan_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return proker_id;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["berkelanjutan_entries", variables.proker_id] });
    },
  });
}

export function useUpdateBerkelanjutanEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, proker_id, ...updates }: Partial<BerkelanjutanInsert> & { id: string; proker_id: string }) => {
      const { error } = await supabase
        .from("berkelanjutan_entries")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return proker_id;
    },
    onSuccess: (proker_id) => {
      qc.invalidateQueries({ queryKey: ["berkelanjutan_entries", proker_id] });
    },
  });
}

export const CATEGORY_LABELS: Record<BerkelanjutanCategory, string> = {
  finance: "💰 Finance (Danus)",
  response: "💬 Response Time (Humas)",
  outreach: "📣 Outreach & Content",
  people: "🤝 People & Community",
  training: "🎓 Training / Seminar",
};
