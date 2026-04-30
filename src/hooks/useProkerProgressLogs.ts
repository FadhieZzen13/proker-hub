import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProkerProgressLog = {
  id: string;
  proker_id: string;
  log_date: string;
  progress: 0 | 25 | 50 | 75 | 100;
  note: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLog(row: any): ProkerProgressLog {
  return {
    ...row,
    note: row.note ?? null,
  } as ProkerProgressLog;
}

export function useProkerProgressLogs(prokerId?: string) {
  return useQuery({
    queryKey: ["proker-progress-logs", prokerId],
    enabled: !!prokerId,
    queryFn: async () => {
      if (!prokerId) return [];
      const { data, error } = await supabase
        .from("proker_progress_logs")
        .select("*")
        .eq("proker_id", prokerId)
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(normalizeLog);
    },
  });
}

export function useAddProkerProgressLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      prokerId,
      log_date,
      progress,
      note,
    }: {
      prokerId: string;
      log_date: string;
      progress: 0 | 25 | 50 | 75 | 100;
      note?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("proker_progress_logs")
        .insert({
          proker_id: prokerId,
          log_date,
          progress,
          note: note ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;

      // Keep existing proker cards/stats in sync using latest logged progress
      const { error: updateError } = await supabase
        .from("prokers")
        .update({ progress })
        .eq("id", prokerId);
      if (updateError) throw updateError;

      return normalizeLog(data);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["proker-progress-logs", vars.prokerId] });
      qc.invalidateQueries({ queryKey: ["prokers"] });
    },
  });
}

export function useDeleteProkerProgressLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prokerId }: { id: string; prokerId: string }) => {
      const { error } = await supabase.from("proker_progress_logs").delete().eq("id", id);
      if (error) throw error;

      // Recompute current progress from latest remaining log (fallback to 0)
      const { data: latest, error: latestError } = await supabase
        .from("proker_progress_logs")
        .select("progress")
        .eq("proker_id", prokerId)
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw latestError;

      const nextProgress = (latest?.progress ?? 0) as 0 | 25 | 50 | 75 | 100;
      const { error: updateError } = await supabase
        .from("prokers")
        .update({ progress: nextProgress })
        .eq("id", prokerId);
      if (updateError) throw updateError;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["proker-progress-logs", vars.prokerId] });
      qc.invalidateQueries({ queryKey: ["prokers"] });
    },
  });
}

export function useUpdateProkerProgressLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      prokerId,
      log_date,
      progress,
      note,
    }: {
      id: string;
      prokerId: string;
      log_date: string;
      progress: 0 | 25 | 50 | 75 | 100;
      note?: string | null;
    }) => {
      const { error } = await supabase
        .from("proker_progress_logs")
        .update({
          log_date,
          progress,
          note: note ?? null,
        })
        .eq("id", id);
      if (error) throw error;

      // Recompute current progress from latest log after update
      const { data: latest, error: latestError } = await supabase
        .from("proker_progress_logs")
        .select("progress")
        .eq("proker_id", prokerId)
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw latestError;

      const nextProgress = (latest?.progress ?? 0) as 0 | 25 | 50 | 75 | 100;
      const { error: updateError } = await supabase
        .from("prokers")
        .update({ progress: nextProgress })
        .eq("id", prokerId);
      if (updateError) throw updateError;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["proker-progress-logs", vars.prokerId] });
      qc.invalidateQueries({ queryKey: ["prokers"] });
    },
  });
}
