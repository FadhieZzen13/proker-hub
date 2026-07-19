import { useCallback, useEffect, useState } from "react";
import { sb } from "@/integrations/supabase/db";

export interface DivisionKpi {
  id: string;
  division: string;
  proker_id: string | null;
  label: string;
  target: number;
  current: number;
  unit: string;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface DivisionKpiInput {
  division: string;
  proker_id?: string | null;
  label: string;
  target: number;
  current?: number;
  unit?: string;
  sort?: number;
}

export function useDivisionKpis(division?: string, prokerId?: string | null) {
  const [kpis, setKpis] = useState<DivisionKpi[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let query = sb.from("division_kpis").select("*").order("sort", { ascending: true });
    if (division) query = query.eq("division", division);
    if (prokerId) query = query.eq("proker_id", prokerId);
    const { data, error } = await query;
    if (error) {
      console.error("Failed to load division KPIs:", error);
      setKpis([]);
    } else {
      setKpis((data ?? []) as DivisionKpi[]);
    }
    setLoading(false);
  }, [division, prokerId]);

  useEffect(() => {
    load();
    const channel = sb
      .channel("division_kpis_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "division_kpis" }, () => load())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [load, prokerId]);

  const addKpi = useCallback(async (input: DivisionKpiInput) => {
    const { error } = await sb.from("division_kpis").insert({
      division: input.division,
      proker_id: input.proker_id ?? null,
      label: input.label,
      target: input.target,
      current: input.current ?? 0,
      unit: input.unit ?? "",
      sort: input.sort ?? 0,
    });
    if (error) throw error;
    await load();
  }, [load]);

  const updateKpi = useCallback(async (id: string, patch: Partial<DivisionKpiInput>) => {
    const { error } = await sb.from("division_kpis").update(patch).eq("id", id);
    if (error) throw error;
    await load();
  }, [load]);

  const deleteKpi = useCallback(async (id: string) => {
    const { error } = await sb.from("division_kpis").delete().eq("id", id);
    if (error) throw error;
    await load();
  }, [load]);

  const deleteByProker = useCallback(async (prokerId: string) => {
    const { error } = await sb.from("division_kpis").delete().eq("proker_id", prokerId);
    if (error) throw error;
    await load();
  }, [load]);

  return { kpis, loading, addKpi, updateKpi, deleteKpi, deleteByProker, reload: load };
}
