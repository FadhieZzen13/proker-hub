import { useMemo, useState } from "react";
import { useMemberStore, type Member } from "@/hooks/useMemberStore";
import { isLeader } from "@/lib/roles";
import { DIVISIONS } from "@/hooks/useProkers";
import {
  useMonthTrackerEntries, fetchAllTrackerEntries,
  useAddTrackerEntry, useUpdateTrackerEntry, useDeleteTrackerEntry,
  currentMonth, TRACKER_PROGRESS, type TrackerEntry, type TrackerProgress,
} from "@/hooks/useTracker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EditableCell } from "@/components/lapak/EditableCell";
import { simpleCSV, downloadCSV } from "@/lib/csv";
import { toast } from "sonner";
import { ClipboardList, Plus, Trash2, FileSpreadsheet } from "lucide-react";

const PROGRESS_STYLES: Record<TrackerProgress, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "On Progress": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "On Going": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "Negotiation": "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "Cancelled": "bg-red-500/15 text-red-600 dark:text-red-400",
  "Done": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

// Kadep → Wakadep → Staff, then alphabetical.
const positionRank = (m: Member) => (m.position === "Kadep" ? 0 : m.position === "Wakadep" ? 1 : 2);

export default function PersonalTrackerPage() {
  const { members, currentMember, isAdmin } = useMemberStore();
  const [month, setMonth] = useState(currentMonth());
  const [division, setDivision] = useState<string>(currentMember?.division ?? DIVISIONS[0]);

  const { data: monthEntries = [], isLoading } = useMonthTrackerEntries(month);
  const add = useAddTrackerEntry();
  const update = useUpdateTrackerEntry();
  const del = useDeleteTrackerEntry();

  const divisionMembers = useMemo(
    () => members
      .filter((m) => m.division === division)
      .sort((a, b) => positionRank(a) - positionRank(b) || a.name.localeCompare(b.name)),
    [members, division]
  );

  // member_id → entries for the selected month (already ordered by sort).
  const entriesByMember = useMemo(() => {
    const map = new Map<string, TrackerEntry[]>();
    for (const e of monthEntries) {
      if (!map.has(e.member_id)) map.set(e.member_id, []);
      map.get(e.member_id)!.push(e);
    }
    return map;
  }, [monthEntries]);

  const canEditMember = (m: Member) =>
    isAdmin || m.id === currentMember?.id || (isLeader(currentMember) && m.division === currentMember?.division);

  // Who can export everyone's data: admin → all; leader → own division.
  const canExportAll = isAdmin || isLeader(currentMember);

  const exportAll = async () => {
    try {
      const all = await fetchAllTrackerEntries();
      const scopedDivisions = isAdmin ? null : new Set([currentMember?.division]);
      const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "—";
      const rows = all
        .filter((e) => !scopedDivisions || scopedDivisions.has(e.division))
        .map((e) => [e.division, e.month, nameOf(e.member_id), e.description, e.progress]);
      if (rows.length === 0) { toast.error("Belum ada catatan untuk diekspor."); return; }
      const csv = simpleCSV(["Division", "Month", "Member", "Description", "Progress"], rows);
      downloadCSV(`tracker_all_${isAdmin ? "all" : currentMember?.division}.csv`, csv);
      toast.success("Exported all trackers (.csv)");
    } catch {
      toast.error("Failed to export.");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Personal Tracker</h1>
        </div>
        <p className="text-sm text-muted-foreground">Catatan kerjaan per divisi — "udah ngerjain apa aja?" beserta progress tiap anggota.</p>
      </div>

      <Card className="border-border/60 mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Bulan</label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full sm:w-44" />
          </div>
          <div className="space-y-1.5 flex-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Divisi</label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger className="w-full sm:max-w-xs"><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
              <SelectContent>
                {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {canExportAll && (
            <Button variant="outline" className="gap-1.5 shrink-0" onClick={exportAll}>
              <FileSpreadsheet className="h-4 w-4" /> Export all
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-border/60"><CardContent className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent></Card>
      ) : divisionMembers.length === 0 ? (
        <Card className="border-dashed border-border/60"><CardContent className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Belum ada anggota di divisi {division}.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {divisionMembers.map((member) => {
            const entries = entriesByMember.get(member.id) ?? [];
            const canEdit = canEditMember(member);
            return (
              <Card key={member.id} className="border-border/60">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-base font-semibold text-foreground">{member.name}</h2>
                    {member.position !== "Staff" && <Badge className="text-[10px] bg-primary/15 text-primary border-0">{member.position}</Badge>}
                    {!canEdit && <Badge variant="outline" className="text-[10px] text-muted-foreground">View-only</Badge>}
                    {canEdit && (
                      <Button size="sm" variant="outline" className="ml-auto gap-1 h-7"
                        onClick={() => add.mutate({ member_id: member.id, division: member.division, month, sort: entries.length })}>
                        <Plus className="h-3.5 w-3.5" /> Tambah
                      </Button>
                    )}
                  </div>

                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground/70 py-3">Belum ada catatan bulan ini.</p>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((e, i) => (
                        <div key={e.id} className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-2 sm:gap-3 items-start">
                          <span className="text-xs text-muted-foreground/50 pt-2">{i + 1}</span>
                          <EditableCell value={e.description} multiline placeholder="Udah ngerjain apa aja?" readOnly={!canEdit}
                            onCommit={(description) => update.mutate({ id: e.id, memberId: member.id, month, description })} />
                          <Select value={e.progress} disabled={!canEdit}
                            onValueChange={(progress) => update.mutate({ id: e.id, memberId: member.id, month, progress: progress as TrackerProgress })}>
                            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TRACKER_PROGRESS.map((p) => (
                                <SelectItem key={p} value={p}>
                                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${PROGRESS_STYLES[p]}`}>{p}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {canEdit ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => del.mutate({ id: e.id, memberId: member.id, month })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : <span />}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
