import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EngagementData, PromotionData, RatingData } from "@/hooks/useProkerAnalytics";

export type ProkerZone = {
  current_status: string;
  current_problem: string;
  way_out: string;
  action_needed: string;
  deadline: string | null;
};

export type ProkerCurrentZone = "red" | "medium" | "green";

export const EMPTY_PROKER_ZONE: ProkerZone = {
  current_status: "",
  current_problem: "",
  way_out: "",
  action_needed: "",
  deadline: null,
};

export type Proker = {
  id: string;
  nama_proker: string;
  division: string;
  collab_divisions: string[];
  tanggal: string;
  target_peserta: number;
  type: "Internal" | "External";
  progress: number;
  description: string | null;
  status: "active" | "complete";
  is_berkelanjutan: boolean;
  berkelanjutan_category: "finance" | "response" | "outreach" | "people" | "training" | null;
  berkelanjutan_notes: string | null;
  actual_peserta: number | null;
  success_factors: string | null;
  improvements: string | null;
  notes: string | null;
  completed_at: string | null;
  promotion_data: PromotionData | null;
  engagement_data: EngagementData | null;
  rating_data: RatingData | null;
  current_zone: ProkerCurrentZone;
  red_zone: ProkerZone;
  medium_zone: ProkerZone;
  green_zone: ProkerZone;
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProkerInsert = Omit<
  Proker,
  "id" | "created_at" | "updated_at" | "completed_at" | "status" |
  "actual_peserta" | "success_factors" | "improvements" | "notes" |
  "promotion_data" | "engagement_data" | "rating_data"
> & {
  berkelanjutan_category?: "finance" | "response" | "outreach" | "people" | "training" | null;
  created_by_member_id?: string | null;
};

export const DIVISIONS = ["BPH", "AKSI", "POSDM", "ROMAS", "HUMAS", "DANUS", "SEBURA", "MEDIFO"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeZone(value: any): ProkerZone {
  return {
    current_status: typeof value?.current_status === "string" ? value.current_status : "",
    current_problem: typeof value?.current_problem === "string" ? value.current_problem : "",
    way_out: typeof value?.way_out === "string" ? value.way_out : "",
    action_needed: typeof value?.action_needed === "string" ? value.action_needed : "",
    deadline: typeof value?.deadline === "string" ? value.deadline : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProker(row: any): Proker {
  const currentZone: ProkerCurrentZone = row.current_zone === "red" || row.current_zone === "medium" || row.current_zone === "green"
    ? row.current_zone
    : "green";

  return {
    ...row,
    collab_divisions: row.collab_divisions ?? [],
    is_berkelanjutan: row.is_berkelanjutan ?? false,
    berkelanjutan_category: row.berkelanjutan_category ?? null,
    berkelanjutan_notes: row.berkelanjutan_notes ?? null,
    promotion_data: row.promotion_data ?? null,
    engagement_data: row.engagement_data ?? null,
    rating_data: row.rating_data ?? null,
    current_zone: currentZone,
    red_zone: normalizeZone(row.red_zone),
    medium_zone: normalizeZone(row.medium_zone),
    green_zone: normalizeZone(row.green_zone),
    created_by_member_id: row.created_by_member_id ?? null,
  } as Proker;
}

/** Fetch prokers for a specific division, including collab prokers */
export function useProkers(division?: string) {
  return useQuery({
    queryKey: ["prokers", division],
    queryFn: async () => {
      if (division) {
        // Fetch primary-division prokers AND prokers where division is a collab
        const [primaryRes, collabRes] = await Promise.all([
          supabase.from("prokers").select("*").eq("division", division).order("created_at", { ascending: false }),
          supabase.from("prokers").select("*").contains("collab_divisions", [division]).order("created_at", { ascending: false }),
        ]);
        if (primaryRes.error) throw primaryRes.error;
        if (collabRes.error) throw collabRes.error;
        const seen = new Set<string>();
        const merged: Proker[] = [];
        for (const row of [...(primaryRes.data ?? []), ...(collabRes.data ?? [])]) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(normalizeProker(row));
          }
        }
        merged.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return merged;
      } else {
        const { data, error } = await supabase.from("prokers").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map(normalizeProker);
      }
    },
  });
}

export function useCreateProker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proker: ProkerInsert) => {
      const { data, error } = await supabase.from("prokers").insert(proker).select().single();
      if (error) throw error;
      return normalizeProker(data);
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
      return normalizeProker(data);
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
