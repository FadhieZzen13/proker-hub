import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";

// 'best_leader' is legacy (kept for old rows); new submissions use the split types.
export type EvaluationType = "best_member" | "best_kadep" | "best_wakadep" | "best_leader";

export interface Evaluation {
  id: string;
  type: EvaluationType;
  period: string;                 // 'YYYY-MM'
  rater_member_id: string | null;
  rater_name: string;
  rater_email: string;
  rater_division: string;
  target_member_id: string | null;
  target_name: string;
  target_division: string;
  score_discipline: number;
  score_contribution: number;
  score_responsibility: number;
  reason: string;
  future_eval: string;
  created_at: string;
}

export type EvaluationInsert = Omit<Evaluation, "id" | "created_at">;

export const EVAL_CRITERIA = [
  { key: "score_discipline", label: "Kedisiplinan" },
  { key: "score_contribution", label: "Kontribusi pada Proker" },
  { key: "score_responsibility", label: "Tanggung Jawab & Komitmen" },
] as const;

export function evalAverage(e: Evaluation): number {
  return (e.score_discipline + e.score_contribution + e.score_responsibility) / 3;
}

export function useEvaluations(type: EvaluationType, period: string) {
  return useQuery({
    queryKey: ["evaluations", type, period],
    enabled: !!period,
    queryFn: async () => {
      const { data, error } = await sb
        .from("evaluations")
        .select("*")
        .eq("type", type)
        .eq("period", period)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Evaluation[];
    },
  });
}

export function useAddEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: EvaluationInsert) => {
      const { data, error } = await sb.from("evaluations").insert(e).select().single();
      if (error) throw error;
      return data as Evaluation;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["evaluations", data.type, data.period] }),
  });
}

export function useDeleteEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, type, period }: { id: string; type: EvaluationType; period: string }) => {
      const { error } = await sb.from("evaluations").delete().eq("id", id);
      if (error) throw error;
      return { type, period };
    },
    onSuccess: ({ type, period }) => qc.invalidateQueries({ queryKey: ["evaluations", type, period] }),
  });
}

// ─── Winners (manually chosen by POSDM Kadep/Wakadep + BPH) ──────────────────
export type WinnerCategory = "best_member" | "best_kadep" | "best_wakadep";

export interface EvaluationWinner {
  id: string;
  period: string;
  category: WinnerCategory;
  winner_member_id: string | null;
  winner_name: string;
  winner_division: string;
  chosen_by_member_id: string | null;
  chosen_by_name: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export function useEvaluationWinners(period: string) {
  return useQuery({
    queryKey: ["evaluation_winners", period],
    enabled: !!period,
    queryFn: async () => {
      const { data, error } = await sb
        .from("evaluation_winners")
        .select("*")
        .eq("period", period);
      if (error) throw error;
      return (data ?? []) as EvaluationWinner[];
    },
  });
}

export interface SetWinnerInput {
  period: string;
  category: WinnerCategory;
  winner_member_id: string | null;
  winner_name: string;
  winner_division: string;
  chosen_by_member_id: string | null;
  chosen_by_name: string;
  note?: string;
}

export function useSetEvaluationWinner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (w: SetWinnerInput) => {
      const { error } = await sb
        .from("evaluation_winners")
        .upsert(
          { ...w, note: w.note ?? "", updated_at: new Date().toISOString() },
          { onConflict: "period,category" }
        );
      if (error) throw error;
      return w.period;
    },
    onSuccess: (period: string) => qc.invalidateQueries({ queryKey: ["evaluation_winners", period] }),
  });
}

export function useClearEvaluationWinner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, period }: { id: string; period: string }) => {
      const { error } = await sb.from("evaluation_winners").delete().eq("id", id);
      if (error) throw error;
      return period;
    },
    onSuccess: (period: string) => qc.invalidateQueries({ queryKey: ["evaluation_winners", period] }),
  });
}

// ─── Aggregation (per target) ───────────────────────────────────────────────
export interface EvalAggregate {
  targetKey: string;
  targetName: string;
  targetDivision: string;
  count: number;
  avgDiscipline: number;
  avgContribution: number;
  avgResponsibility: number;
  avgOverall: number;
  evaluations: Evaluation[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function aggregateEvaluations(list: Evaluation[]): EvalAggregate[] {
  const groups = new Map<string, Evaluation[]>();
  for (const e of list) {
    const key = e.target_member_id ?? `name:${e.target_name.toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const out: EvalAggregate[] = [];
  for (const [targetKey, evals] of groups) {
    const n = evals.length;
    const sum = (sel: (e: Evaluation) => number) => evals.reduce((s, e) => s + sel(e), 0);
    const avgD = sum((e) => e.score_discipline) / n;
    const avgC = sum((e) => e.score_contribution) / n;
    const avgR = sum((e) => e.score_responsibility) / n;
    out.push({
      targetKey,
      targetName: evals[0].target_name,
      targetDivision: evals[0].target_division,
      count: n,
      avgDiscipline: round1(avgD),
      avgContribution: round1(avgC),
      avgResponsibility: round1(avgR),
      avgOverall: round1((avgD + avgC + avgR) / 3),
      evaluations: evals,
    });
  }
  return out.sort((a, b) => b.avgOverall - a.avgOverall);
}
