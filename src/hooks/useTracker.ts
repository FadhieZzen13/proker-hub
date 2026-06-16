import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";

export const TRACKER_PROGRESS = [
  "Not Started", "On Progress", "On Going", "Negotiation", "Cancelled", "Done",
] as const;
export type TrackerProgress = (typeof TRACKER_PROGRESS)[number];

export interface TrackerEntry {
  id: string;
  member_id: string;
  division: string;
  month: string;          // 'YYYY-MM'
  description: string;
  progress: TrackerProgress;
  sort: number;
  created_at: string;
  updated_at: string;
}

/** Current month as 'YYYY-MM'. */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useTrackerEntries(memberId: string | undefined, month: string) {
  return useQuery({
    queryKey: ["tracker_entries", memberId, month],
    enabled: !!memberId && !!month,
    queryFn: async () => {
      const { data, error } = await sb
        .from("tracker_entries")
        .select("*")
        .eq("member_id", memberId)
        .eq("month", month)
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrackerEntry[];
    },
  });
}

/** Every member's entries for a month — used for the admin/leader "export all". */
export function useMonthTrackerEntries(month: string) {
  return useQuery({
    queryKey: ["tracker_entries_month", month],
    enabled: !!month,
    queryFn: async () => {
      const { data, error } = await sb
        .from("tracker_entries")
        .select("*")
        .eq("month", month)
        .order("division", { ascending: true })
        .order("member_id", { ascending: true })
        .order("sort", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrackerEntry[];
    },
  });
}

/** Every tracker entry across all members and months — for the "export all" CSV. */
export async function fetchAllTrackerEntries(): Promise<TrackerEntry[]> {
  const { data, error } = await sb
    .from("tracker_entries")
    .select("*")
    .order("division", { ascending: true })
    .order("month", { ascending: true })
    .order("member_id", { ascending: true })
    .order("sort", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TrackerEntry[];
}

function invalidate(qc: ReturnType<typeof useQueryClient>, memberId: string, month: string) {
  qc.invalidateQueries({ queryKey: ["tracker_entries", memberId, month] });
  qc.invalidateQueries({ queryKey: ["tracker_entries_month", month] });
}

export function useAddTrackerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      member_id: string; division: string; month: string; description?: string; progress?: TrackerProgress; sort?: number;
    }) => {
      const { error } = await sb.from("tracker_entries").insert(entry);
      if (error) throw error;
      return { memberId: entry.member_id, month: entry.month };
    },
    onSuccess: ({ memberId, month }) => invalidate(qc, memberId, month),
  });
}

export function useUpdateTrackerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, memberId, month, ...updates }: {
      id: string; memberId: string; month: string; description?: string; progress?: TrackerProgress;
    }) => {
      const { error } = await sb.from("tracker_entries").update(updates).eq("id", id);
      if (error) throw error;
      return { memberId, month };
    },
    onSuccess: ({ memberId, month }) => invalidate(qc, memberId, month),
  });
}

export function useDeleteTrackerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, memberId, month }: { id: string; memberId: string; month: string }) => {
      const { error } = await sb.from("tracker_entries").delete().eq("id", id);
      if (error) throw error;
      return { memberId, month };
    },
    onSuccess: ({ memberId, month }) => invalidate(qc, memberId, month),
  });
}
