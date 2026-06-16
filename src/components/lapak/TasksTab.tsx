import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ExternalLink, ListChecks } from "lucide-react";
import { EditableCell } from "./EditableCell";
import { EmptyHint } from "./LinksTab";
import {
  useLapakTasks, useAddLapakTask, useUpdateLapakTask, useDeleteLapakTask,
} from "@/hooks/useLapak";

export function TasksTab({ prokerId, canEdit = true }: { prokerId: string; canEdit?: boolean }) {
  const { data: tasks = [], isLoading } = useLapakTasks(prokerId);
  const add = useAddLapakTask();
  const update = useUpdateLapakTask();
  const del = useDeleteLapakTask();

  const doneCount = tasks.filter((t) => t.done).length;

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
                <EditableCell value={t.notes} placeholder="Catatan" multiline readOnly={!canEdit}
                  onCommit={(notes) => update.mutate({ id: t.id, prokerId, notes })} />
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
    </div>
  );
}
