import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Trophy, ChevronDown, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { simpleCSV, downloadCSV } from "@/lib/csv";
import {
  useEvaluations, aggregateEvaluations, evalAverage, useDeleteEvaluation,
  type EvaluationType,
} from "@/hooks/useEvaluations";

export function EvaluationResults({
  type, period, canDelete,
}: { type: EvaluationType; period: string; canDelete: boolean }) {
  const { data: evals = [], isLoading } = useEvaluations(type, period);
  const del = useDeleteEvaluation();
  const aggregates = aggregateEvaluations(evals);

  if (isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  if (aggregates.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Belum ada penilaian untuk periode ini.</p>;
  }

  const medal = ["text-amber-500", "text-slate-400", "text-amber-700"];

  const exportExcel = () => {
    const headers = ["Period", "Target", "Target Division", "Rater", "Rater Division", "Kedisiplinan", "Kontribusi", "Tanggung Jawab", "Rata-rata", "Alasan", "Evaluasi ke depan"];
    const rows = evals.map((e) => [
      e.period, e.target_name, e.target_division, e.rater_name, e.rater_division,
      e.score_discipline, e.score_contribution, e.score_responsibility,
      evalAverage(e).toFixed(2), e.reason, e.future_eval,
    ]);
    downloadCSV(`${type}_${period}.csv`, simpleCSV(headers, rows));
    toast.success("Exported to Excel (.csv)");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {evals.length} penilaian · {aggregates.length} kandidat · diurutkan dari skor tertinggi.
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={exportExcel}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Export to Excel
        </Button>
      </div>
      {aggregates.map((a, idx) => (
        <Collapsible key={a.targetKey} className="rounded-lg border border-border/60">
          <div className="flex items-center gap-3 px-4 py-3">
            <Trophy className={`h-5 w-5 shrink-0 ${idx < 3 ? medal[idx] : "text-muted-foreground/30"}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{a.targetName}</span>
                <Badge variant="outline" className="text-[10px]">{a.targetDivision}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>Disiplin {a.avgDiscipline}</span>
                <span>Kontribusi {a.avgContribution}</span>
                <span>Tanggung jawab {a.avgResponsibility}</span>
                <span>· {a.count} penilai</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-primary tabular-nums">{a.avgOverall}</div>
              <div className="text-[10px] text-muted-foreground">avg / 5</div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><ChevronDown className="h-4 w-4" /></Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="px-4 pb-3 space-y-2 border-t border-border/40 pt-3">
              {a.evaluations.map((e) => (
                <div key={e.id} className="rounded-md bg-muted/20 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      oleh <strong className="text-foreground">{e.rater_name || "—"}</strong>
                      {e.rater_division ? ` · ${e.rater_division}` : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">D{e.score_discipline} · K{e.score_contribution} · TJ{e.score_responsibility}</span>
                      {canDelete && (
                        <button className="text-muted-foreground/60 hover:text-destructive"
                          onClick={() => del.mutate({ id: e.id, type, period })}><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </div>
                  {e.reason && <p className="mt-1.5 text-foreground/90 whitespace-pre-wrap">{e.reason}</p>}
                  {e.future_eval && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">Evaluasi ke depan: {e.future_eval}</p>}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
