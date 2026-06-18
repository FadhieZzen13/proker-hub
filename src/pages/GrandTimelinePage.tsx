import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProkers, DIVISIONS, type Proker } from "@/hooks/useProkers";
import { getProkerDisplayName } from "@/lib/prokerDisplay";
import { CalendarView, type CalendarEvent } from "@/components/CalendarView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarRange, Repeat2, LayoutList, Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, format, addMonths } from "date-fns";

type Grouping = "week" | "month";
type Range = "1month" | "3months" | "all";
type ViewMode = "list" | "calendar";

interface Bucket {
  key: string;
  label: string;
  sortAt: number;
  prokers: Proker[];
}

export default function GrandTimelinePage() {
  const { data: prokers = [], isLoading } = useProkers();
  const navigate = useNavigate();
  const [division, setDivision] = useState<string>("all");
  const [grouping, setGrouping] = useState<Grouping>("month");
  const [range, setRange] = useState<Range>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Only activated prokers (hide drafts), matching division filter.
  const divisionFiltered = useMemo(
    () => prokers
      .filter((p) => p.lapak_ready)
      .filter((p) => division === "all" || p.division === division || (p.collab_divisions ?? []).includes(division)),
    [prokers, division]
  );

  // Range filter: all past prokers always included; future capped at N months when not "all".
  const filtered = useMemo(() => {
    if (range === "all") return divisionFiltered;
    const cutoff = addMonths(new Date(), range === "1month" ? 1 : 3);
    return divisionFiltered.filter((p) => new Date(p.tanggal) <= cutoff);
  }, [divisionFiltered, range]);

  // instanceKey resets CalendarView when range changes so it jumps to the right month.
  const calendarInstanceKey = `grand-${division}-${range}`;

  const calendarEvents = useMemo<CalendarEvent[]>(() =>
    filtered
      .filter((p) => !isNaN(new Date(p.tanggal).getTime()))
      .map((p) => ({
        date: p.tanggal.slice(0, 10),
        label: getProkerDisplayName(p.nama_proker, p.description),
        kind: "proker" as const,
        meta: p.division,
      })),
  [filtered]);

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    for (const p of filtered) {
      const d = new Date(p.tanggal + "T00:00:00");
      if (isNaN(d.getTime())) continue;
      let start: Date;
      let label: string;
      if (grouping === "week") {
        start = startOfWeek(d, { weekStartsOn: 1 });
        const end = endOfWeek(d, { weekStartsOn: 1 });
        label = `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
      } else {
        start = startOfMonth(d);
        label = format(start, "MMMM yyyy");
      }
      const key = start.toISOString();
      if (!map.has(key)) map.set(key, { key, label, sortAt: start.getTime(), prokers: [] });
      map.get(key)!.prokers.push(p);
    }
    const out = [...map.values()].sort((a, b) => a.sortAt - b.sortAt);
    for (const b of out) b.prokers.sort((a, b2) => new Date(a.tanggal).getTime() - new Date(b2.tanggal).getTime());
    return out;
  }, [filtered, grouping]);

  const noResults = filtered.length === 0 || (viewMode === "list" && buckets.length === 0);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <CalendarRange className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Grand Timeline</h1>
        </div>
        <p className="text-sm text-muted-foreground">Semua proker PPI UPM diurutkan berdasarkan tanggal.</p>
      </div>

      <Card className="border-border/60 mb-6">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          {/* Division filter */}
          <div className="space-y-1.5 flex-1 min-w-[180px]">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Divisi</label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger className="w-full sm:max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua divisi</SelectItem>
                {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Range filter */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Rentang</label>
            <div className="flex rounded-md border border-border overflow-hidden w-fit">
              {(["1month", "3months", "all"] as Range[]).map((r) => (
                <Button key={r} variant={range === r ? "default" : "ghost"} size="sm"
                  className="rounded-none text-xs px-2.5"
                  onClick={() => setRange(r)}>
                  {r === "1month" ? "1 Bln" : r === "3months" ? "3 Bln" : "Semua"}
                </Button>
              ))}
            </div>
          </div>

          {/* View mode */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Tampilan</label>
            <div className="flex rounded-md border border-border overflow-hidden w-fit">
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none gap-1"
                onClick={() => setViewMode("list")}>
                <LayoutList className="h-3.5 w-3.5" /> List
              </Button>
              <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none gap-1"
                onClick={() => setViewMode("calendar")}>
                <Calendar className="h-3.5 w-3.5" /> Kalender
              </Button>
            </div>
          </div>

          {/* Grouping — list only */}
          {viewMode === "list" && (
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Grup</label>
              <div className="flex rounded-md border border-border overflow-hidden w-fit">
                <Button variant={grouping === "week" ? "default" : "ghost"} size="sm" className="rounded-none"
                  onClick={() => setGrouping("week")}>Per Minggu</Button>
                <Button variant={grouping === "month" ? "default" : "ghost"} size="sm" className="rounded-none"
                  onClick={() => setGrouping("month")}>Per Bulan</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-border/60"><CardContent className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent></Card>
      ) : noResults ? (
        <Card className="border-dashed border-border/60"><CardContent className="py-16 text-center">
          <CalendarRange className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {divisionFiltered.length > 0 && filtered.length === 0
              ? "Tidak ada proker dalam rentang ini. Perluas ke 3 Bln atau Semua."
              : "Belum ada proker untuk ditampilkan."}
          </p>
        </CardContent></Card>
      ) : viewMode === "calendar" ? (
        <Card className="border-border/60">
          <CardContent className="p-4 sm:p-6">
            <CalendarView events={calendarEvents} instanceKey={calendarInstanceKey} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {buckets.map((bucket) => (
            <div key={bucket.key}>
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="text-sm font-semibold text-foreground">{bucket.label}</h2>
                <span className="text-xs text-muted-foreground">{bucket.prokers.length} proker</span>
              </div>
              <div className="ml-1 border-l-2 border-border/60 pl-4 space-y-2">
                {bucket.prokers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/division/${p.division}`)}
                    className="w-full text-left rounded-lg border border-border/60 bg-card p-3 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{getProkerDisplayName(p.nama_proker, p.description)}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{format(new Date(p.tanggal + "T00:00:00"), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{p.division}</Badge>
                      {(p.collab_divisions ?? []).map((d) => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}
                      {p.is_berkelanjutan && (
                        <Badge variant="outline" className="text-[10px] gap-0.5 border-blue-300 text-blue-600"><Repeat2 className="h-2.5 w-2.5" /> Ongoing</Badge>
                      )}
                      <Badge className={`text-[10px] ${p.status === "complete" ? "bg-green-500/10 text-green-600 border-green-200" : "bg-muted text-muted-foreground"}`}>
                        {p.status === "complete" ? "Complete" : "Active"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
