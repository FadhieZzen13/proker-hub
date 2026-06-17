import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMemberStore, type Member } from "@/hooks/useMemberStore";
import { DIVISIONS } from "@/hooks/useProkers";
import { POSITIONS } from "@/lib/roles";
import { Search, Users, Phone, BookOpen, Calendar, ChevronLeft, ChevronRight, ArrowUpDown, Pencil, Trash2, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 10;
type SortKey = "name" | "faculty" | "intake" | "division";
type SortDir = "asc" | "desc";

const FACULTIES_FILTER = [
  "Faculty of Agriculture",
  "Faculty of Forestry and Environment",
  "Faculty of Veterinary Medicine",
  "Faculty of Economics and Management",
  "Faculty of Engineering",
  "Faculty of Educational Studies",
  "Faculty of Science",
  "Faculty of Food Science and Technology",
  "Faculty of Design and Architecture",
  "Faculty of Modern Languages and Communication",
  "Faculty of Medicine and Health Sciences",
  "Faculty of Human Ecology",
  "Faculty of Biotechnology and Biomolecular Sciences",
  "Faculty of Computer Science and Information Technology",
  "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const INTAKE_YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i);

export default function MembersPage() {
  const { members, isAdmin, deleteMember, updateMember, clearAllMembers } = useMemberStore();

  const [search, setSearch] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("all");
  const [filterIntake, setFilterIntake] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  // Admin edit state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = [...members];
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((m) => m.name.toLowerCase().includes(q) || m.faculty.toLowerCase().includes(q));
    if (filterFaculty !== "all") list = list.filter((m) => m.faculty === filterFaculty);
    if (filterIntake !== "all") list = list.filter((m) => String(m.intake) === filterIntake);
    if (filterDivision !== "all") list = list.filter((m) => m.division === filterDivision);
    list.sort((a, b) => {
      let va: string | number = a[sortKey];
      let vb: string | number = b[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [members, search, filterFaculty, filterIntake, filterDivision, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch(""); setFilterFaculty("all"); setFilterIntake("all"); setFilterDivision("all");
    setSortKey("name"); setSortDir("asc"); setPage(1);
  };

  const openEdit = (m: Member) => { setEditingMember(m); setEditForm({ ...m }); };
  const handleSaveEdit = () => {
    if (!editingMember) return;
    updateMember(editingMember.id, editForm);
    toast.success("Member updated");
    setEditingMember(null);
  };
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMember(deleteTarget.id);
    toast.success(`${deleteTarget.name} removed`);
    setDeleteTarget(null);
  };
  const handleClearAll = () => {
    clearAllMembers();
    toast.success("All members cleared");
    setShowClearAll(false);
  };

  const exportCSV = () => {
    const headers = ["Name", "Faculty", "Intake", "Division", "Phone", "Registered"];
    const rows = filtered.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.faculty.replace(/"/g, '""')}"`,
      m.intake,
      m.division,
      `"${m.phone.replace(/"/g, '""')}"`,
      m.registeredAt ? new Date(m.registeredAt).toLocaleDateString() : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ppi_upm_members.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        sortKey === k ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={() => toggleSort(k)}
    >
      {label}<ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "opacity-100" : "opacity-40"}`} />
    </button>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Members</h1>
            <Badge variant="secondary" className="text-xs">{members.length} total</Badge>
          </div>
          <p className="text-sm text-muted-foreground">All registered PPI UPM cabinet members</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => setShowClearAll(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Clear All Members
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="border-border/60 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or faculty..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={filterDivision} onValueChange={(v) => { setFilterDivision(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Division" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Divisions</SelectItem>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterFaculty} onValueChange={(v) => { setFilterFaculty(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Faculty" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Faculties</SelectItem>{FACULTIES_FILTER.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterIntake} onValueChange={(v) => { setFilterIntake(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Intake" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Intakes</SelectItem>{INTAKE_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            {(search || filterFaculty !== "all" || filterIntake !== "all" || filterDivision !== "all") && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No members yet</p>
            <p className="text-xs text-muted-foreground mt-1">Members will appear here after they register</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No members match your filters</p>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-2 text-xs">Clear filters</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/60 overflow-hidden">
            <div className={`hidden sm:grid gap-4 px-5 py-3 bg-muted/30 border-b border-border/60 ${isAdmin ? "grid-cols-[2fr_2fr_1fr_1fr_1.5fr_auto]" : "grid-cols-[2fr_2fr_1fr_1fr_1.5fr]"}`}>
              <SortButton k="name" label="Name" />
              <SortButton k="faculty" label="Faculty" />
              <SortButton k="intake" label="Intake" />
              <SortButton k="division" label="Division" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</span>
              {isAdmin && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>}
            </div>
            <div className="divide-y divide-border/40">
              {paginated.map((member, i) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  index={(page - 1) * PAGE_SIZE + i + 1}
                  isAdmin={isAdmin}
                  onEdit={() => openEdit(member)}
                  onDelete={() => setDeleteTarget(member)}
                />
              ))}
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === "..." ? (
                  <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">...</span>
                ) : (
                  <Button key={p} variant={page === p ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p as number)}>{p}</Button>
                ))}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Faculty</Label>
              <Select value={editForm.faculty ?? ""} onValueChange={(v) => setEditForm((f) => ({ ...f, faculty: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FACULTIES_FILTER.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Intake Year</Label>
              <Select value={String(editForm.intake ?? "")} onValueChange={(v) => setEditForm((f) => ({ ...f, intake: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTAKE_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input value={editForm.phone ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Division</Label>
              <div className="flex flex-wrap gap-2">
                {DIVISIONS.map((d) => (
                  <button key={d} type="button" onClick={() => setEditForm((f) => ({ ...f, division: d }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      editForm.division === d ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Position</Label>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map((p) => (
                  <button key={p} type="button" onClick={() => setEditForm((f) => ({ ...f, position: p }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      editForm.position === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}>{p}</button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Kadep/Wakadep can score members; BPH scores leaders. Position drives evaluation access.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>{deleteTarget?.name}</strong> from the members list? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirm */}
      <AlertDialog open={showClearAll} onOpenChange={setShowClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Clear All Members?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete all {members.length} registered members. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleClearAll}>Yes, Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemberRow({
  member, index, isAdmin, onEdit, onDelete
}: {
  member: Member; index: number; isAdmin: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
      {/* Mobile */}
      <div className="sm:hidden space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground text-sm">{member.name}</span>
          <div className="flex items-center gap-1">
            {member.position !== "Staff" && (
              <Badge className="text-[10px] bg-primary/15 text-primary border-0">{member.position}</Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{member.division}</Badge>
            {isAdmin && (
              <>
                <button className="p-1 text-muted-foreground hover:text-foreground" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="p-1 text-muted-foreground hover:text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{member.faculty}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{member.intake}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{member.phone}</div>
      </div>
      {/* Desktop */}
      <div className={`hidden sm:grid gap-4 items-center ${isAdmin ? "grid-cols-[2fr_2fr_1fr_1fr_1.5fr_auto]" : "grid-cols-[2fr_2fr_1fr_1fr_1.5fr]"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/50 w-5 shrink-0">{index}</span>
          <span className="font-medium text-foreground text-sm truncate">{member.name}</span>
        </div>
        <span className="text-sm text-muted-foreground truncate">{member.faculty}</span>
        <span className="text-sm text-foreground font-medium">{member.intake}</span>
        <div className="flex items-center gap-1.5 w-fit">
          <Badge variant="outline" className="text-xs">{member.division}</Badge>
          {member.position !== "Staff" && (
            <Badge className="text-[10px] bg-primary/15 text-primary border-0">{member.position}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" /><span className="truncate">{member.phone}</span>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}

