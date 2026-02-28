import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InternalRating {
  id: string;
  proker_id: string;
  rater_name: string;
  rater_division: string;
  overall_rating: number;
  notes: string | null;
  created_at: string;
}

export function useInternalRatings(prokerId: string) {
  return useQuery({
    queryKey: ["internal_ratings", prokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proker_internal_ratings")
        .select("*")
        .eq("proker_id", prokerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InternalRating[];
    },
    enabled: !!prokerId,
  });
}

export function useAddInternalRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rating: Omit<InternalRating, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("proker_internal_ratings")
        .insert(rating)
        .select()
        .single();
      if (error) throw error;
      return data as InternalRating;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["internal_ratings", data.proker_id] });
    },
  });
}

export function useDeleteInternalRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prokerId }: { id: string; prokerId: string }) => {
      const { error } = await supabase.from("proker_internal_ratings").delete().eq("id", id);
      if (error) throw error;
      return prokerId;
    },
    onSuccess: (prokerId) => {
      qc.invalidateQueries({ queryKey: ["internal_ratings", prokerId] });
    },
  });
}

/** Compute the average internal rating */
export function averageInternalRating(ratings: InternalRating[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((s, r) => s + r.overall_rating, 0);
  return parseFloat((sum / ratings.length).toFixed(1));
}
