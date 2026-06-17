import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProkers, DIVISIONS, type Proker } from "@/hooks/useProkers";
import { getProkerDisplayName } from "@/lib/prokerDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarRange, Repeat2 } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, format } from "date-fns";

type Grouping = "week" | "month";

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

  // Only activated prokers (hide drafts), matching the dashboards.
  const filtered = useMemo(
    () => prokers
      .filter((p) => p.lapak_ready)
      .filter((p) => division === "all" || p.division === division || (p.collab_divisions ?? []).includes(division)),
    [prokers, division]
  );

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    for (const p of filtered) {
      const d = new Date(p.tanggal);
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
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-1.5 flex-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Divisi</label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger className="w-full sm:max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua divisi</SelectItem>
                {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Tampilan</label>
            <div className="flex rounded-md border border-border overflow-hidden w-fit">
              <Button variant={grouping === "week" ? "default" : "ghost"} size="sm" className="rounded-none"
                onClick={() => setGrouping("week")}>Per Minggu</Button>
              <Button variant={grouping === "month" ? "default" : "ghost"} size="sm" className="rounded-none"
                onClick={() => setGrouping("month")}>Per Bulan</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-border/60"><CardContent className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent></Card>
      ) : buckets.length === 0 ? (
        <Card className="border-dashed border-border/60"><CardContent className="py-16 text-center">
          <CalendarRange className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada proker untuk ditampilkan.</p>
        </CardContent></Card>
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
                      <span className="text-xs text-muted-foreground shrink-0">{format(new Date(p.tanggal), "dd MMM yyyy")}</span>
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
