import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EditableCell } from "@/components/lapak/EditableCell";
import { useLapakTasks } from "@/hooks/useLapak";
import {
  useLapakTimeline, useAddLapakTimeline, useUpdateLapakTimeline, useDeleteLapakTimeline,
} from "@/hooks/useLapak";
import { CalendarView, type CalendarEvent } from "@/components/CalendarView";
import { CalendarRange, ListChecks, Flag, Plus, Trash2, LayoutList, Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, format, addMonths } from "date-fns";

type Grouping = "week" | "month";
type Range = "1month" | "3months" | "all";
type ViewMode = "list" | "calendar";

interface TimelineItem {
  key: string;
  date: string;          // YYYY-MM-DD
  label: string;
  kind: "task" | "milestone";
  meta?: string;
}

export function TimelineTab({ prokerId, canEdit = true }: { prokerId: string; canEdit?: boolean }) {
  const { data: tasks = [] } = useLapakTasks(prokerId);
  const { data: milestones = [] } = useLapakTimeline(prokerId);
  const add = useAddLapakTimeline();
  const update = useUpdateLapakTimeline();
  const del = useDeleteLapakTimeline();
  const [grouping, setGrouping] = useState<Grouping>("month");
  const [range, setRange] = useState<Range>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Task deadlines (read-only) + manual milestones → one chronological list.
  const allItems = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];
    for (const t of tasks) {
      if (!t.deadline) continue;
      out.push({ key: `task-${t.id}`, date: t.deadline, label: t.tugas || "(tugas tanpa nama)", kind: "task", meta: t.pic });
    }
    for (const m of milestones) {
      if (!m.event_date) continue;
      out.push({ key: `ms-${m.id}`, date: m.event_date, label: m.label || "(milestone tanpa nama)", kind: "milestone" });
    }
    return out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [tasks, milestones]);

  // Range filter: all past items always included; future capped at N months when not "all".
  const items = useMemo<TimelineItem[]>(() => {
    if (range === "all") return allItems;
    const cutoff = addMonths(new Date(), range === "1month" ? 1 : 3);
    return allItems.filter((it) => new Date(it.date) <= cutoff);
  }, [allItems, range]);

  // instanceKey resets the CalendarView whenever the range changes, so it navigates
  // to the best month for the new filtered set instead of keeping the old position.
  const calendarInstanceKey = `timeline-${prokerId}-${range}`;

  const calendarEvents = useMemo<CalendarEvent[]>(() =>
    items.map((it) => ({ date: it.date, label: it.label, kind: it.kind, meta: it.meta })),
  [items]);

  const buckets = useMemo(() => {
    const map = new Map<string, { label: string; sortAt: number; items: TimelineItem[] }>();
    for (const it of items) {
      const d = new Date(it.date + "T00:00:00");
      if (isNaN(d.getTime())) continue;
      let start: Date; let label: string;
      if (grouping === "week") {
        start = startOfWeek(d, { weekStartsOn: 1 });
        label = `${format(start, "dd MMM")} – ${format(endOfWeek(d, { weekStartsOn: 1 }), "dd MMM yyyy")}`;
      } else {
        start = startOfMonth(d);
        label = format(start, "MMMM yyyy");
      }
      const key = start.toISOString();
      if (!map.has(key)) map.set(key, { label, sortAt: start.getTime(), items: [] });
      map.get(key)!.items.push(it);
    }
    return [...map.values()].sort((a, b) => a.sortAt - b.sortAt);
  }, [items, grouping]);

  const isEmpty = items.length === 0 || (viewMode === "list" && buckets.length === 0);

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1 min-w-0">
          Deadline dari <strong>Pembagian Tugas</strong> + milestone manual.
        </p>

        {/* Range filter */}
        <div className="flex rounded-md border border-border overflow-hidden w-fit shrink-0">
          {(["1month", "3months", "all"] as Range[]).map((r) => (
            <Button key={r} variant={range === r ? "default" : "ghost"} size="sm"
              className="rounded-none text-xs px-2.5"
              onClick={() => setRange(r)}>
              {r === "1month" ? "1 Bln" : r === "3months" ? "3 Bln" : "Semua"}
            </Button>
          ))}
        </div>

        {/* View mode */}
        <div className="flex rounded-md border border-border overflow-hidden w-fit shrink-0">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none gap-1"
            onClick={() => setViewMode("list")}>
            <LayoutList className="h-3.5 w-3.5" /> List
          </Button>
          <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none gap-1"
            onClick={() => setViewMode("calendar")}>
            <Calendar className="h-3.5 w-3.5" /> Kalender
          </Button>
        </div>

        {/* Grouping — only relevant for list view */}
        {viewMode === "list" && (
          <div className="flex rounded-md border border-border overflow-hidden w-fit shrink-0">
            <Button variant={grouping === "week" ? "default" : "ghost"} size="sm" className="rounded-none"
              onClick={() => setGrouping("week")}>Per Minggu</Button>
            <Button variant={grouping === "month" ? "default" : "ghost"} size="sm" className="rounded-none"
              onClick={() => setGrouping("month")}>Per Bulan</Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="rounded-md border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
          <CalendarRange className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {allItems.length > 0 && items.length === 0
            ? "Tidak ada event dalam rentang ini. Perluas ke 3 Bln atau Semua."
            : "Belum ada deadline atau milestone. Tambahkan deadline di Pembagian Tugas atau milestone di bawah."}
        </div>
      )}

      {/* Calendar view */}
      {viewMode === "calendar" && !isEmpty && (
        <CalendarView events={calendarEvents} instanceKey={calendarInstanceKey} />
      )}

      {/* List view */}
      {viewMode === "list" && !isEmpty && (
        <div className="space-y-5">
          {buckets.map((bucket) => (
            <div key={bucket.label}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-sm font-semibold text-foreground">{bucket.label}</h3>
                <span className="text-xs text-muted-foreground">{bucket.items.length}</span>
              </div>
              <div className="ml-1 border-l-2 border-border/60 pl-4 space-y-2">
                {bucket.items.map((it) => (
                  <div key={it.key} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2.5">
                    {it.kind === "task"
                      ? <ListChecks className="h-4 w-4 text-blue-500 shrink-0" />
                      : <Flag className="h-4 w-4 text-amber-500 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{it.label}</p>
                      {it.meta && <p className="text-[11px] text-muted-foreground">PIC: {it.meta}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{it.kind === "task" ? "Tugas" : "Milestone"}</Badge>
                    <span className="text-xs text-muted-foreground shrink-0">{format(new Date(it.date + "T00:00:00"), "dd MMM")}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Milestone editor */}
      {canEdit && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Milestones</p>
              <Button size="sm" variant="outline" className="gap-1"
                onClick={() => add.mutate({ proker_id: prokerId, label: "", event_date: new Date().toISOString().slice(0, 10), notes: "", sort: milestones.length })}>
                <Plus className="h-3.5 w-3.5" /> Add milestone
              </Button>
            </div>
            {milestones.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tambahkan milestone (mis. "Proposal selesai", "Hari-H").</p>
            ) : (
              milestones.map((m) => (
                <div key={m.id} className="grid grid-cols-[1.4fr_auto_auto] gap-2 items-center">
                  <EditableCell value={m.label} placeholder="Nama milestone"
                    onCommit={(label) => update.mutate({ id: m.id, prokerId, label })} />
                  <Input type="date" className="h-8 w-[150px] text-sm" value={m.event_date ?? ""}
                    onChange={(e) => update.mutate({ id: m.id, prokerId, event_date: e.target.value || null })} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => del.mutate({ id: m.id, prokerId })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
