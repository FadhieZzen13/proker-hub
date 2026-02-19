import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Proker = {
  id: string;
  nama_proker: string;
  division: string;
  tanggal: string;
  target_peserta: number;
  type: "Internal" | "External";
  progress: number;
  description: string | null;
  status: "active" | "complete";
  actual_peserta: number | null;
  success_factors: string | null;
  improvements: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProkerInsert = Omit<Proker, "id" | "created_at" | "updated_at" | "completed_at" | "status" | "actual_peserta" | "success_factors" | "improvements" | "notes">;

export const DIVISIONS = ["BPH", "AKSI", "POSDM", "ROMAS", "HUMAS", "DANUS", "SEBURA", "MEDIFO"] as const;

export function useProkers(division?: string) {
  return useQuery({
    queryKey: ["prokers", division],
    queryFn: async () => {
      let query = supabase.from("prokers").select("*").order("created_at", { ascending: false });
      if (division) query = query.eq("division", division);
      const { data, error } = await query;
      if (error) throw error;
      return data as Proker[];
    },
  });
}

export function useCreateProker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proker: ProkerInsert) => {
      const { data, error } = await supabase.from("prokers").insert(proker).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prokers"] }),
  });
}

export function useUpdateProker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Proker> & { id: string }) => {
      const { data, error } = await supabase.from("prokers").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prokers"] }),
  });
}

export function useDeleteProker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prokers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prokers"] }),
  });
}
