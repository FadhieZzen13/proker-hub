import { useState } from "react";
import { useMemberStore } from "@/hooks/useMemberStore";
import {
  canSubmitBestMember, canSubmitBestLeader, canViewEvalResults,
} from "@/lib/roles";
import { currentMonth } from "@/hooks/useTracker";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Lock } from "lucide-react";
import { EvaluationForm } from "@/components/evaluation/EvaluationForm";
import { EvaluationResults } from "@/components/evaluation/EvaluationResults";
import { EvaluationEntries, WinnerBanner } from "@/components/evaluation/EvaluationEntries";
import { useEvaluationWinners, type WinnerCategory } from "@/hooks/useEvaluations";

export default function EvaluationPage() {
  const { members, currentMember, isAdmin } = useMemberStore();
  const [period, setPeriod] = useState(currentMonth());

  const canMember = canSubmitBestMember(currentMember, isAdmin);
  const canLeader = canSubmitBestLeader(currentMember, isAdmin);
  const canResults = canViewEvalResults(currentMember, isAdmin);

  const { data: winners = [] } = useEvaluationWinners(period);
  const winnerFor = (cat: WinnerCategory) => winners.find((w) => w.category === cat) ?? null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Award className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Evaluasi Kinerja</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Penilaian Best Member (oleh Kadep/Wakadep) & Best Kadep/Wakadep (oleh BPH). Tab <strong>Entries</strong> (tinjau &amp; pilih pemenang) dan <strong>Hasil</strong> hanya untuk POSDM Kadep/Wakadep & BPH. Ganti bulan di atas untuk semua tab.
        </p>
      </div>

      <Card className="border-border/60 mb-6">
        <CardContent className="p-4 flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground shrink-0">Bulan penilaian</label>
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-44" />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="best_member">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="best_member">Best Member</TabsTrigger>
              <TabsTrigger value="best_kadep">Best Kadep</TabsTrigger>
              <TabsTrigger value="best_wakadep">Best Wakadep</TabsTrigger>
              {canResults && <TabsTrigger value="entries">Entries</TabsTrigger>}
              {canResults && <TabsTrigger value="results">Hasil</TabsTrigger>}
            </TabsList>

            <div className="mt-5">
              <TabsContent value="best_member">
                {canMember ? (
                  <EvaluationForm type="best_member" period={period} members={members} currentMember={currentMember} isAdmin={isAdmin} />
                ) : (
                  <RestrictedNote text="Hanya Kepala/Wakil Kepala Departemen yang dapat menilai Best Member." />
                )}
              </TabsContent>

              <TabsContent value="best_kadep">
                {canLeader ? (
                  <EvaluationForm type="best_kadep" period={period} members={members} currentMember={currentMember} isAdmin={isAdmin} />
                ) : (
                  <RestrictedNote text="Hanya Badan Pengurus Harian (BPH) yang dapat menilai Best Kadep." />
                )}
              </TabsContent>

              <TabsContent value="best_wakadep">
                {canLeader ? (
                  <EvaluationForm type="best_wakadep" period={period} members={members} currentMember={currentMember} isAdmin={isAdmin} />
                ) : (
                  <RestrictedNote text="Hanya Badan Pengurus Harian (BPH) yang dapat menilai Best Wakadep." />
                )}
              </TabsContent>

              {canResults && (
                <TabsContent value="entries">
                  <EvaluationEntries period={period} currentMember={currentMember} isAdmin={isAdmin} />
                </TabsContent>
              )}

              {canResults && (
                <TabsContent value="results">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-base font-semibold text-foreground mb-3">🏅 Best Member — {period}</h3>
                      {winnerFor("best_member") && <div className="mb-3"><WinnerBanner winner={winnerFor("best_member")!} /></div>}
                      <EvaluationResults type="best_member" period={period} canDelete={isAdmin} />
                    </section>
                    <section>
                      <h3 className="text-base font-semibold text-foreground mb-3">🏅 Best Kadep — {period}</h3>
                      {winnerFor("best_kadep") && <div className="mb-3"><WinnerBanner winner={winnerFor("best_kadep")!} /></div>}
                      <EvaluationResults type="best_kadep" period={period} canDelete={isAdmin} />
                    </section>
                    <section>
                      <h3 className="text-base font-semibold text-foreground mb-3">🏅 Best Wakadep — {period}</h3>
                      {winnerFor("best_wakadep") && <div className="mb-3"><WinnerBanner winner={winnerFor("best_wakadep")!} /></div>}
                      <EvaluationResults type="best_wakadep" period={period} canDelete={isAdmin} />
                    </section>
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function RestrictedNote({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground/80">
      <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
