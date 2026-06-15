import { useMemo, useState } from "react";
import { useMemberStore } from "@/hooks/useMemberStore";
import { isLeader } from "@/lib/roles";
import {
  useTrackerEntries, useAddTrackerEntry, useUpdateTrackerEntry, useDeleteTrackerEntry,
  currentMonth, TRACKER_PROGRESS, type TrackerProgress,
} from "@/hooks/useTracker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
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

export default function PersonalTrackerPage() {
  const { members, currentMember, isAdmin } = useMemberStore();
  const [month, setMonth] = useState(currentMonth());

  // Who can the viewer see? admin = all; leader = own division; staff/guest = self only.
  const visibleMembers = useMemo(() => {
    if (isAdmin) return members;
    if (isLeader(currentMember)) return members.filter((m) => m.division === currentMember!.division);
    return currentMember ? [currentMember] : [];
  }, [members, currentMember, isAdmin]);

  const [memberId, setMemberId] = useState<string>(currentMember?.id ?? "");
  const effectiveMemberId = visibleMembers.some((m) => m.id === memberId) ? memberId : (visibleMembers[0]?.id ?? "");
  const member = members.find((m) => m.id === effectiveMemberId) ?? null;

  const { data: entries = [], isLoading } = useTrackerEntries(effectiveMemberId, month);
  const add = useAddTrackerEntry();
  const update = useUpdateTrackerEntry();
  const del = useDeleteTrackerEntry();

  const canPickOthers = isAdmin || isLeader(currentMember);

  const membersByDivision = useMemo(() => {
    const map = new Map<string, typeof visibleMembers>();
    for (const m of visibleMembers) {
      if (!map.has(m.division)) map.set(m.division, []);
      map.get(m.division)!.push(m);
    }
    return [...map.entries()];
  }, [visibleMembers]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Personal Tracker</h1>
        </div>
        <p className="text-sm text-muted-foreground">Catatan kerjaan per bulan — "udah ngerjain apa aja?" beserta progress-nya.</p>
      </div>

      {!currentMember && !isAdmin ? (
        <Card className="border-dashed border-border/60"><CardContent className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Login dulu untuk mengisi tracker-mu.</p>
        </CardContent></Card>
      ) : (
        <>
          <Card className="border-border/60 mb-6">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Bulan</label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full sm:w-44" />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Anggota</label>
                <Select value={effectiveMemberId} onValueChange={setMemberId} disabled={!canPickOthers}>
                  <SelectTrigger className="w-full sm:max-w-sm"><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                  <SelectContent>
                    {membersByDivision.map(([division, list]) => (
                      <SelectGroup key={division}>
                        <SelectLabel>{division}</SelectLabel>
                        {list.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}{m.position !== "Staff" ? ` · ${m.position}` : ""}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {member && (
                <Button className="gap-1 shrink-0"
                  onClick={() => add.mutate({ member_id: member.id, division: member.division, month, sort: entries.length })}>
                  <Plus className="h-4 w-4" /> Tambah
                </Button>
              )}
            </CardContent>
          </Card>

          {!member ? (
            <Card className="border-dashed border-border/60"><CardContent className="py-16 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada anggota untuk ditampilkan.</p>
            </CardContent></Card>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-base font-semibold text-foreground">{member.name}</h2>
                  <Badge variant="outline" className="text-xs">{member.division}</Badge>
                  {member.position !== "Staff" && <Badge className="text-[10px] bg-primary/15 text-primary border-0">{member.position}</Badge>}
                  <Button
                    variant="outline" size="sm" className="ml-auto gap-1.5"
                    disabled={entries.length === 0}
                    onClick={() => {
                      const rows = entries.map((e, i) => [i + 1, e.description, e.progress]);
                      const csv = simpleCSV(["No", "Deskripsi", "Progress"], rows);
                      downloadCSV(`tracker_${member.name.replace(/[^a-z0-9]+/gi, "_")}_${month}.csv`, csv);
                      toast.success("Exported to Excel (.csv)");
                    }}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export to Excel
                  </Button>
                </div>

                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
                ) : entries.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground/70">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Belum ada catatan untuk bulan ini. Klik "Tambah".</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((e, i) => (
                      <div key={e.id} className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-2 sm:gap-3 items-start">
                        <span className="text-xs text-muted-foreground/50 pt-2">{i + 1}</span>
                        <EditableCell value={e.description} multiline placeholder="Udah ngerjain apa aja?"
                          onCommit={(description) => update.mutate({ id: e.id, memberId: member.id, month, description })} />
                        <Select value={e.progress}
                          onValueChange={(progress) => update.mutate({ id: e.id, memberId: member.id, month, progress: progress as TrackerProgress })}>
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRACKER_PROGRESS.map((p) => (
                              <SelectItem key={p} value={p}>
                                <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${PROGRESS_STYLES[p]}`}>{p}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => del.mutate({ id: e.id, memberId: member.id, month })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
