import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ExternalLink, ListChecks, Users } from "lucide-react";
import { EditableCell } from "./EditableCell";
import { EmptyHint } from "./LinksTab";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useLapakTasks, useAddLapakTask, useUpdateLapakTask, useDeleteLapakTask,
} from "@/hooks/useLapak";
import { useAssignTaskMembers, type AssignedMember } from "@/hooks/useTaskAssignments";
import { useMemberStore } from "@/hooks/useMemberStore";
import type { LapakTask } from "@/hooks/useLapak";

export function TasksTab({
  prokerId,
  canEdit = true,
  division,
  collabDivisions = [],
}: {
  prokerId: string;
  canEdit?: boolean;
  division: string;
  collabDivisions?: string[];
}) {
  const { data: tasks = [], isLoading } = useLapakTasks(prokerId);
  const add = useAddLapakTask();
  const update = useUpdateLapakTask();
  const del = useDeleteLapakTask();
  const assign = useAssignTaskMembers();
  const { members } = useMemberStore();

  // Only members from divisions involved in this proker can be assigned.
  const allowedDivisions = useMemo(
    () => new Set<string>([division, ...collabDivisions]),
    [division, collabDivisions]
  );
  const eligibleMembers = useMemo(
    () => members.filter((m) => allowedDivisions.has(m.division)),
    [members, allowedDivisions]
  );

  const doneCount = tasks.filter((t) => t.done).length;
  const [assigning, setAssigning] = useState<LapakTask | null>(null);
  const [selected, setSelected] = useState<Record<string, AssignedMember>>({});

  const openAssign = (t: LapakTask) => {
    setSelected(Object.fromEntries((t.members ?? []).map((m) => [m.id, m])));
    setAssigning(t);
  };

  const saveAssign = async () => {
    if (!assigning) return;
    try {
      await assign.mutateAsync({ taskId: assigning.id, prokerId, members: Object.values(selected) });
      setAssigning(null);
    } catch {
      // surfaced via the mutation error state if needed
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pembagian tugas {tasks.length > 0 && <span className="text-foreground font-medium">· {doneCount}/{tasks.length} selesai</span>}
        </p>
        {canEdit && (
          <Button size="sm" variant="outline" className="gap-1"
            onClick={() => add.mutate({ proker_id: prokerId, tugas: "", pic: "", link: "", notes: "", done: false, sort: tasks.length })}>
            <Plus className="h-3.5 w-3.5" /> Add task
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : tasks.length === 0 ? (
        <EmptyHint icon={<ListChecks className="h-8 w-8" />} text="Belum ada tugas. Tambahkan baris tugas." />
      ) : (
        <div className="rounded-lg border border-border/60 overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[28px_1.6fr_1fr_0.9fr_1fr_1.4fr_auto] gap-3 px-4 py-2 bg-muted/30 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span></span><span>Tugas</span><span>PIC</span><span>Deadline</span><span>Link</span><span>Notes</span><span></span>
            </div>
            {tasks.map((t) => (
              <div key={t.id} className="grid grid-cols-[28px_1.6fr_1fr_0.9fr_1fr_1.4fr_auto] gap-3 px-4 py-2.5 border-b border-border/40 items-start">
                <div className="pt-1.5">
                  <Checkbox checked={t.done} disabled={!canEdit} onCheckedChange={(c) => update.mutate({ id: t.id, prokerId, done: !!c })} />
                </div>
                <EditableCell value={t.tugas} placeholder="Nama tugas" multiline readOnly={!canEdit}
                  onCommit={(tugas) => update.mutate({ id: t.id, prokerId, tugas })}
                  className={t.done ? "line-through text-muted-foreground" : ""} />
                <EditableCell value={t.pic} placeholder="Nama PIC" readOnly={!canEdit}
                  onCommit={(pic) => update.mutate({ id: t.id, prokerId, pic })} />
                <EditableCell value={t.deadline ?? ""} type="date" readOnly={!canEdit}
                  onCommit={(deadline) => update.mutate({ id: t.id, prokerId, deadline: deadline || null })} />
                <EditableCell value={t.link} placeholder="https://…" readOnly={!canEdit}
                  onCommit={(link) => update.mutate({ id: t.id, prokerId, link })} />
                <div className="space-y-1.5">
                  <EditableCell value={t.notes} placeholder="Catatan" multiline readOnly={!canEdit}
                    onCommit={(notes) => update.mutate({ id: t.id, prokerId, notes })} />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openAssign(t)}
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <Users className="h-3 w-3" />
                      {(t.members ?? []).length > 0 ? "Assigned" : "Assign"}
                    </button>
                  )}
                  {(t.members ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(t.members ?? []).map((m) => (
                        <Badge key={m.id} className="text-[10px] bg-primary/15 text-primary border-0">{m.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 justify-end pt-0.5">
                  {t.link && (
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                      <a href={t.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </Button>
                  )}
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => del.mutate({ id: t.id, prokerId })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!assigning} onOpenChange={(o) => !o && setAssigning(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Assign task members</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{assigning?.tugas || "(untitled task)"}</p>
          <div className="flex flex-wrap gap-1">
            {[...allowedDivisions].map((d) => (
              <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 py-2">
            {eligibleMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members in the involved divisions.</p>
            ) : (
              eligibleMembers.map((m) => {
                const checked = !!selected[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelected((prev) => {
                      const next = { ...prev };
                      if (next[m.id]) delete next[m.id];
                      else next[m.id] = { id: m.id, name: m.name };
                      return next;
                    })}
                    className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
                      checked ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-sm text-foreground">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.division} · {m.position}</span>
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button onClick={saveAssign} disabled={assign.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
