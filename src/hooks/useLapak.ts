import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";

// ─── Row types (mirror the lapak_* migration) ───────────────────────────────
export interface LapakLink {
  id: string; proker_id: string; label: string; url: string; sort: number; created_at: string;
}
export interface LapakTask {
  id: string; proker_id: string; tugas: string; pic: string; link: string;
  deadline: string | null; done: boolean; notes: string; sort: number; created_at: string;
  members: { id: string; name: string }[];
}
export interface LapakJuknis {
  id: string; proker_id: string; waktu: string; durasi: string; keterangan: string;
  deskripsi: string; pengisi: string; penanggung_jawab: string; properti: string;
  notes: string; sort: number; created_at: string;
}
export interface LapakRab {
  id: string; proker_id: string; kebutuhan: string; quantity: number; satuan: string;
  harga_satuan: number; sort: number; created_at: string;
}
export interface ResponseColumn { key: string; label: string; }
export interface LapakResponseSet {
  id: string; proker_id: string; name: string; columns: ResponseColumn[]; created_at: string;
}
export interface LapakResponseRow {
  id: string; set_id: string; data: Record<string, string>; sort: number; created_at: string;
}

export interface LapakTimelineEntry {
  id: string; proker_id: string; label: string; event_date: string | null; notes: string; sort: number; created_at: string;
}

type ChildTable = "lapak_links" | "lapak_tasks" | "lapak_juknis" | "lapak_rab" | "lapak_timeline";

// ─── Generic CRUD for proker-scoped child rows ──────────────────────────────
function useChildList<T>(table: ChildTable, prokerId: string | undefined) {
  return useQuery({
    queryKey: [table, prokerId],
    enabled: !!prokerId,
    queryFn: async () => {
      const { data, error } = await sb
        .from(table)
        .select("*")
        .eq("proker_id", prokerId)
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

function useAddChild(table: ChildTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown> & { proker_id: string }) => {
      const { data, error } = await sb.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: { proker_id: string }) => qc.invalidateQueries({ queryKey: [table, data.proker_id] }),
  });
}

function useUpdateChild(table: ChildTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prokerId, ...updates }: { id: string; prokerId: string } & Record<string, unknown>) => {
      const { error } = await sb.from(table).update(updates).eq("id", id);
      if (error) throw error;
      return prokerId;
    },
    onSuccess: (prokerId: string) => qc.invalidateQueries({ queryKey: [table, prokerId] }),
  });
}

function useDeleteChild(table: ChildTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prokerId }: { id: string; prokerId: string }) => {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw error;
      return prokerId;
    },
    onSuccess: (prokerId: string) => qc.invalidateQueries({ queryKey: [table, prokerId] }),
  });
}

// Links
export const useLapakLinks = (id?: string) => useChildList<LapakLink>("lapak_links", id);
export const useAddLapakLink = () => useAddChild("lapak_links");
export const useUpdateLapakLink = () => useUpdateChild("lapak_links");
export const useDeleteLapakLink = () => useDeleteChild("lapak_links");

// Tasks
export const useLapakTasks = (id?: string) => useChildList<LapakTask>("lapak_tasks", id);
export const useAddLapakTask = () => useAddChild("lapak_tasks");
export const useUpdateLapakTask = () => useUpdateChild("lapak_tasks");
export const useDeleteLapakTask = () => useDeleteChild("lapak_tasks");

// Juknis
export const useLapakJuknis = (id?: string) => useChildList<LapakJuknis>("lapak_juknis", id);
export const useAddLapakJuknis = () => useAddChild("lapak_juknis");
export const useUpdateLapakJuknis = () => useUpdateChild("lapak_juknis");
export const useDeleteLapakJuknis = () => useDeleteChild("lapak_juknis");

// RAB
export const useLapakRab = (id?: string) => useChildList<LapakRab>("lapak_rab", id);
export const useAddLapakRab = () => useAddChild("lapak_rab");
export const useUpdateLapakRab = () => useUpdateChild("lapak_rab");
export const useDeleteLapakRab = () => useDeleteChild("lapak_rab");

// Timeline (manual milestones; combined with task deadlines in the UI)
export const useLapakTimeline = (id?: string) => useChildList<LapakTimelineEntry>("lapak_timeline", id);
export const useAddLapakTimeline = () => useAddChild("lapak_timeline");
export const useUpdateLapakTimeline = () => useUpdateChild("lapak_timeline");
export const useDeleteLapakTimeline = () => useDeleteChild("lapak_timeline");

// ─── Notes (one row per proker) ─────────────────────────────────────────────
export function useLapakNotes(prokerId: string | undefined) {
  return useQuery({
    queryKey: ["lapak_notes", prokerId],
    enabled: !!prokerId,
    queryFn: async () => {
      const { data, error } = await sb.from("lapak_notes").select("*").eq("proker_id", prokerId).maybeSingle();
      if (error) throw error;
      return (data?.content ?? "") as string;
    },
  });
}

export function useSaveLapakNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ prokerId, content }: { prokerId: string; content: string }) => {
      const { error } = await sb
        .from("lapak_notes")
        .upsert({ proker_id: prokerId, content, updated_at: new Date().toISOString() }, { onConflict: "proker_id" });
      if (error) throw error;
      return prokerId;
    },
    onSuccess: (prokerId: string) => qc.invalidateQueries({ queryKey: ["lapak_notes", prokerId] }),
  });
}

// ─── Form Responses (spreadsheet-like sets + rows) ──────────────────────────
export function useResponseSets(prokerId: string | undefined) {
  return useQuery({
    queryKey: ["lapak_response_sets", prokerId],
    enabled: !!prokerId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lapak_response_sets")
        .select("*")
        .eq("proker_id", prokerId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LapakResponseSet[];
    },
  });
}

export function useResponseRows(setId: string | undefined) {
  return useQuery({
    queryKey: ["lapak_response_rows", setId],
    enabled: !!setId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lapak_response_rows")
        .select("*")
        .eq("set_id", setId)
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LapakResponseRow[];
    },
  });
}

export function useCreateResponseSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (set: { proker_id: string; name: string; columns: ResponseColumn[] }) => {
      const { data, error } = await sb.from("lapak_response_sets").insert(set).select().single();
      if (error) throw error;
      return data as LapakResponseSet;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["lapak_response_sets", data.proker_id] }),
  });
}

export function useUpdateResponseSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prokerId, ...updates }: { id: string; prokerId: string; name?: string; columns?: ResponseColumn[] }) => {
      const { error } = await sb.from("lapak_response_sets").update(updates).eq("id", id);
      if (error) throw error;
      return prokerId;
    },
    onSuccess: (prokerId: string) => qc.invalidateQueries({ queryKey: ["lapak_response_sets", prokerId] }),
  });
}

export function useDeleteResponseSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prokerId }: { id: string; prokerId: string }) => {
      const { error } = await sb.from("lapak_response_sets").delete().eq("id", id);
      if (error) throw error;
      return prokerId;
    },
    onSuccess: (prokerId: string) => qc.invalidateQueries({ queryKey: ["lapak_response_sets", prokerId] }),
  });
}

export function useAddResponseRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { set_id: string; data: Record<string, string>; sort?: number }) => {
      const { error } = await sb.from("lapak_response_rows").insert(row);
      if (error) throw error;
      return row.set_id;
    },
    onSuccess: (setId: string) => qc.invalidateQueries({ queryKey: ["lapak_response_rows", setId] }),
  });
}

/** Bulk insert rows (used by CSV/TSV paste import). */
export function useImportResponseRows() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ setId, rows }: { setId: string; rows: Record<string, string>[] }) => {
      const payload = rows.map((data, i) => ({ set_id: setId, data, sort: i }));
      const { error } = await sb.from("lapak_response_rows").insert(payload);
      if (error) throw error;
      return setId;
    },
    onSuccess: (setId: string) => qc.invalidateQueries({ queryKey: ["lapak_response_rows", setId] }),
  });
}

export function useUpdateResponseRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, setId, data }: { id: string; setId: string; data: Record<string, string> }) => {
      const { error } = await sb.from("lapak_response_rows").update({ data }).eq("id", id);
      if (error) throw error;
      return setId;
    },
    onSuccess: (setId: string) => qc.invalidateQueries({ queryKey: ["lapak_response_rows", setId] }),
  });
}

export function useDeleteResponseRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, setId }: { id: string; setId: string }) => {
      const { error } = await sb.from("lapak_response_rows").delete().eq("id", id);
      if (error) throw error;
      return setId;
    },
    onSuccess: (setId: string) => qc.invalidateQueries({ queryKey: ["lapak_response_rows", setId] }),
  });
}
