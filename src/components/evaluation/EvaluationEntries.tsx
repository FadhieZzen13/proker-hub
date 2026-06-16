import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Trophy, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import type { Member } from "@/hooks/useMemberStore";
import {
  useEvaluations, aggregateEvaluations,
  useEvaluationWinners, useSetEvaluationWinner, useClearEvaluationWinner,
  type WinnerCategory, type EvaluationWinner, type EvalAggregate,
} from "@/hooks/useEvaluations";

const CATEGORY_TITLES: Record<WinnerCategory, string> = {
  best_member: "Best Member",
  best_kadep: "Best Kadep",
  best_wakadep: "Best Wakadep",
};

const WINNER_CATEGORIES: WinnerCategory[] = ["best_member", "best_kadep", "best_wakadep"];

/** Read-only winner banner — reused in the Hasil tab. */
export function WinnerBanner({
  winner, onClear,
}: { winner: EvaluationWinner; onClear?: () => void }) {
  return (
    <div className="rounded-lg border border-amber-300/70 bg-amber-50/60 dark:bg-amber-500/5 p-3 flex items-center gap-3">
      <Trophy className="h-6 w-6 text-amber-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">🏆 {winner.winner_name || "—"}</span>
          {winner.winner_division && <Badge variant="outline" className="text-[10px]">{winner.winner_division}</Badge>}
        </div>
        {winner.chosen_by_name && (
          <p className="text-xs text-muted-foreground mt-0.5">Dipilih oleh {winner.chosen_by_name}</p>
        )}
      </div>
      {onClear && (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0" onClick={onClear}>
          Ganti
        </Button>
      )}
    </div>
  );
}

export function EvaluationEntries({
  period, currentMember, isAdmin,
}: { period: string; currentMember: Member | null; isAdmin: boolean }) {
  const { data: winners = [] } = useEvaluationWinners(period);
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Semua penilaian masuk untuk <strong>{period}</strong>. Tinjau, lalu pilih pemenang tiap kategori.
        Pemenang adalah keputusan manual (skor rata-rata hanya panduan).
      </p>
      {WINNER_CATEGORIES.map((cat) => (
        <EntriesSection
          key={cat}
          category={cat}
          period={period}
          winner={winners.find((w) => w.category === cat) ?? null}
          currentMember={currentMember}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

function EntriesSection({
  category, period, winner, currentMember, isAdmin,
}: {
  category: WinnerCategory;
  period: string;
  winner: EvaluationWinner | null;
  currentMember: Member | null;
  isAdmin: boolean;
}) {
  const { data: subs = [], isLoading } = useEvaluations(category, period);
  const setWinner = useSetEvaluationWinner();
  const clearWinner = useClearEvaluationWinner();
  const candidates = useMemo(() => aggregateEvaluations(subs), [subs]);

  const isCurrentWinner = (c: EvalAggregate) =>
    !!winner && (
      (winner.winner_member_id && c.evaluations[0]?.target_member_id === winner.winner_member_id) ||
      (!winner.winner_member_id && c.targetName === winner.winner_name)
    );

  const choose = (c: EvalAggregate) => {
    setWinner.mutate(
      {
        period, category,
        winner_member_id: c.evaluations[0]?.target_member_id ?? null,
        winner_name: c.targetName,
        winner_division: c.targetDivision,
        chosen_by_member_id: currentMember?.id ?? null,
        chosen_by_name: currentMember?.name ?? (isAdmin ? "Admin" : ""),
      },
      { onSuccess: () => toast.success(`Pemenang ${CATEGORY_TITLES[category]}: ${c.targetName}`) }
    );
  };

  const medal = ["text-amber-500", "text-slate-400", "text-amber-700"];

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">{CATEGORY_TITLES[category]} — {period}</h3>

      {winner
        ? <WinnerBanner winner={winner} onClear={() => clearWinner.mutate({ id: winner.id, period })} />
        : <p className="text-xs text-muted-foreground">Belum ada pemenang dipilih.</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Belum ada penilaian untuk periode ini.</p>
      ) : (
        candidates.map((a, idx) => (
          <Collapsible key={a.targetKey} className="rounded-lg border border-border/60">
            <div className="flex items-center gap-3 px-4 py-3">
              <Trophy className={`h-5 w-5 shrink-0 ${idx < 3 ? medal[idx] : "text-muted-foreground/30"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{a.targetName}</span>
                  <Badge variant="outline" className="text-[10px]">{a.targetDivision}</Badge>
                  {isCurrentWinner(a) && <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-0">🏆 Pemenang</Badge>}
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
              <Button
                size="sm"
                variant={isCurrentWinner(a) ? "default" : "outline"}
                className="shrink-0 gap-1"
                disabled={setWinner.isPending}
                onClick={() => choose(a)}
              >
                {isCurrentWinner(a) ? <><Check className="h-3.5 w-3.5" /> Pemenang</> : "Pilih"}
              </Button>
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
                      <span className="text-xs font-medium">D{e.score_discipline} · K{e.score_contribution} · TJ{e.score_responsibility}</span>
                    </div>
                    {e.reason && <p className="mt-1.5 text-foreground/90 whitespace-pre-wrap">{e.reason}</p>}
                    {e.future_eval && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">Evaluasi ke depan: {e.future_eval}</p>}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))
      )}
    </section>
  );
}
