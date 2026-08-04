import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useProkers, useUpdateProker, type Proker } from "@/hooks/useProkers";
import { useLapakTasks, useLapakLinks } from "@/hooks/useLapak";
import { useMemberStore } from "@/hooks/useMemberStore";
import { canEditLapak } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Link2, ListChecks, Clock, Wallet, StickyNote, Table2, CheckCircle2, AlertTriangle, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { LinksTab } from "@/components/lapak/LinksTab";
import { TasksTab } from "@/components/lapak/TasksTab";
import { JuknisTab } from "@/components/lapak/JuknisTab";
import { RabTab } from "@/components/lapak/RabTab";
import { NotesTab } from "@/components/lapak/NotesTab";
import { ResponsesTab } from "@/components/lapak/ResponsesTab";
import { TimelineTab } from "@/components/lapak/TimelineTab";

export default function LapakKerjaPage() {
  const { data: prokers = [], isLoading } = useProkers();
  const { currentMember, isAdmin } = useMemberStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string>("");

  // Preselect from ?proker= (set when a new proker is created or a draft is opened).
  useEffect(() => {
    const fromUrl = searchParams.get("proker");
    if (fromUrl && fromUrl !== selectedId) setSelectedId(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSearchParams(id ? { proker: id } : {}, { replace: true });
  };

  // Group prokers by division for the selector
  const byDivision = useMemo(() => {
    const map = new Map<string, Proker[]>();
    for (const p of prokers) {
      if (!map.has(p.division)) map.set(p.division, []);
      map.get(p.division)!.push(p);
    }
    return [...map.entries()];
  }, [prokers]);

  const selected = prokers.find((p) => p.id === selectedId) ?? null;

  // View is open to everyone; editing is limited to the divisions running the
  // proker, plus Admin/Secretary/Bendahara.
  const canEdit = canEditLapak(currentMember, isAdmin, selected);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Lapak Kerja</h1>
        </div>
        <p className="text-sm text-muted-foreground">Workspace per proker — links, pembagian tugas, juknis, RAB, notes, dan respons form.</p>
      </div>

      <Card className="border-border/60 mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Pilih proker</span>
          <Select value={selectedId} onValueChange={handleSelect}>
            <SelectTrigger className="w-full sm:max-w-md">
              <SelectValue placeholder={isLoading ? "Loading prokers…" : prokers.length ? "Select a proker…" : "No prokers yet"} />
            </SelectTrigger>
            <SelectContent>
              {byDivision.map(([division, list]) => (
                <SelectGroup key={division}>
                  <SelectLabel>{division}</SelectLabel>
                  {list.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama_proker}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <Badge variant="outline" className="text-xs">{selected.division}</Badge>
              <Badge variant="secondary" className="text-xs">{selected.type}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {!selected ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {prokers.length ? "Pilih proker untuk membuka workspace-nya" : "Belum ada proker. Buat proker dulu di dashboard divisi."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">{selected.nama_proker}</h2>
              {selected.lapak_ready
                ? <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Active</Badge>
                : <Badge className="bg-amber-500/15 text-amber-700 border-0 text-[10px]">Draft</Badge>}
            </div>
            <ActivationBanner proker={selected} />
            {!canEdit && (
              <div className="mb-4 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                View-only — this proker's Lapak Kerja can be edited by{" "}
                {[selected.division, ...(selected.collab_divisions ?? [])].join(", ")} members, the Secretary and the Bendahara.
              </div>
            )}
            <Tabs defaultValue="links">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="links" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Links</TabsTrigger>
                <TabsTrigger value="tasks" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Pembagian Tugas</TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5"><CalendarRange className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
                <TabsTrigger value="juknis" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Juknis</TabsTrigger>
                <TabsTrigger value="rab" className="gap-1.5"><Wallet className="h-3.5 w-3.5" /> RAB</TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Notes</TabsTrigger>
                <TabsTrigger value="responses" className="gap-1.5"><Table2 className="h-3.5 w-3.5" /> Form Responses</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                <TabsContent value="links"><LinksTab prokerId={selected.id} canEdit={canEdit} /></TabsContent>
                <TabsContent value="tasks"><TasksTab prokerId={selected.id} canEdit={canEdit} division={selected.division} collabDivisions={selected.collab_divisions ?? []} /></TabsContent>
                <TabsContent value="timeline"><TimelineTab prokerId={selected.id} canEdit={canEdit} /></TabsContent>
                <TabsContent value="juknis"><JuknisTab prokerId={selected.id} canEdit={canEdit} /></TabsContent>
                <TabsContent value="rab"><RabTab prokerId={selected.id} canEdit={canEdit} /></TabsContent>
                <TabsContent value="notes"><NotesTab prokerId={selected.id} canEdit={canEdit} /></TabsContent>
                <TabsContent value="responses"><ResponsesTab prokerId={selected.id} canEdit={canEdit} /></TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Shows the Draft → Active gate for a proker. Minimum to activate: at least 1
 * task (Pembagian Tugas) AND at least 1 link. Auto-activates once met.
 */
function ActivationBanner({ proker }: { proker: Proker }) {
  const { data: tasks = [] } = useLapakTasks(proker.id);
  const { data: links = [] } = useLapakLinks(proker.id);
  const update = useUpdateProker();

  const hasTask = tasks.length > 0;
  const hasLink = links.length > 0;
  const meetsMinimum = hasTask && hasLink;

  // Auto-activate once the minimum is reached.
  useEffect(() => {
    if (meetsMinimum && !proker.lapak_ready && !update.isPending) {
      update.mutate(
        { id: proker.id, lapak_ready: true },
        { onSuccess: () => toast.success("Proker activated 🎉 — it now appears in dashboards & analytics.") }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetsMinimum, proker.lapak_ready, proker.id]);

  if (proker.lapak_ready) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-300/70 bg-amber-50/50 dark:bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-semibold text-foreground">Draft — complete Lapak Kerja to activate</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        This proker is hidden from dashboards & analytics, and can't be rated or completed until you add the basics below.
      </p>
      <div className="flex flex-col gap-1.5">
        <Requirement met={hasTask} label="At least 1 row in Pembagian Tugas" />
        <Requirement met={hasLink} label="At least 1 link in All Links" />
      </div>
    </div>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met
        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />}
      <span className={met ? "text-muted-foreground line-through" : "text-foreground"}>{label}</span>
    </div>
  );
}
