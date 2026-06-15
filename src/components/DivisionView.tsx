import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, ChevronLeft, ChevronRight, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProkers, type Proker } from "@/hooks/useProkers";
import { ProkerCard } from "@/components/ProkerCard";
import { ProkerModal } from "@/components/ProkerModal";
import { ProkerDetail } from "@/components/ProkerDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberStore } from "@/hooks/useMemberStore";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PAGE_SIZE = 9;

interface DivisionViewProps {
  division: string;
}

export function DivisionView({ division }: DivisionViewProps) {
  const { data: prokers, isLoading } = useProkers(division);
  const { members, currentMember, isAdmin } = useMemberStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<"all" | "red" | "medium" | "green">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProker, setEditProker] = useState<Proker | null>(null);
  const [selectedProker, setSelectedProker] = useState<Proker | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!prokers) return [];
    return prokers.filter((p) => {
      const matchSearch = p.nama_proker.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || p.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [prokers, search, typeFilter]);

  // Drafts: newly-created prokers whose Lapak Kerja minimum isn't met yet.
  const draftFiltered = useMemo(() => filtered.filter((p) => !p.lapak_ready), [filtered]);

  const activeFiltered = useMemo(() => {
    const zoneRank: Record<Proker["current_zone"], number> = { red: 0, medium: 1, green: 2 };
    return filtered
      .filter((p) => p.lapak_ready && p.status === "active")
      .filter((p) => zoneFilter === "all" || p.current_zone === zoneFilter)
      .sort((a, b) => zoneRank[a.current_zone] - zoneRank[b.current_zone]);
  }, [filtered, zoneFilter]);

  const completedFiltered = useMemo(() => {
    return filtered.filter((p) => p.lapak_ready && p.status === "complete");
  }, [filtered]);

  const memberNameById = useMemo(() => {
    return Object.fromEntries(members.map((member) => [member.id, member.name]));
  }, [members]);

  const canManageDivision = isAdmin || currentMember?.division === division;
  const canEditProker = (proker: Proker) => {
    if (isAdmin) return true;
    const memberDivision = currentMember?.division;
    if (!memberDivision) return false;
    return proker.division === memberDivision || (proker.collab_divisions ?? []).includes(memberDivision);
  };

  const getCreatorName = (proker: Proker) => {
    if (!proker.created_by_member_id) return "Legacy proker";
    return memberNameById[proker.created_by_member_id] ?? "Unknown member";
  };

  // Reset page when filters change
  const pageCount = Math.max(1, Math.ceil(activeFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = zoneFilter === "all"
    ? activeFiltered
    : activeFiltered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const groupedByZone = useMemo(() => {
    return {
      red: paged.filter((p) => p.current_zone === "red"),
      medium: paged.filter((p) => p.current_zone === "medium"),
      green: paged.filter((p) => p.current_zone === "green"),
    };
  }, [paged]);

  const handleEdit = (proker: Proker) => {
    if (!canEditProker(proker)) {
      toast.error("You can only edit prokers in your division");
      return;
    }
    setEditProker(proker);
    setModalOpen(true);
  };

  const handleCardClick = (proker: Proker) => {
    setSelectedProker(proker);
    setDetailOpen(true);
  };

  const activeCount = prokers?.filter((p) => p.lapak_ready && p.status === "active").length ?? 0;
  const completeCount = prokers?.filter((p) => p.lapak_ready && p.status === "complete").length ?? 0;
  const draftCount = prokers?.filter((p) => !p.lapak_ready).length ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Division {division}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active · {completeCount} completed{draftCount > 0 ? ` · ${draftCount} draft` : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            if (!canManageDivision) {
              toast.error("You can only create prokers in your division");
              return;
            }
            setEditProker(null);
            setModalOpen(true);
          }}
          className="bg-primary text-primary-foreground"
          disabled={!canManageDivision}
        >
          <Plus className="h-4 w-4 mr-2" /> New Proker
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search prokers..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Internal">Internal</SelectItem>
            <SelectItem value="External">External</SelectItem>
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={(v) => { setZoneFilter(v as "all" | "red" | "medium" | "green"); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="red">Red Zone</SelectItem>
            <SelectItem value="medium">Medium Zone</SelectItem>
            <SelectItem value="green">Green Zone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : activeFiltered.length === 0 && completedFiltered.length === 0 && draftFiltered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No prokers found</p>
          <p className="text-sm mt-1">Create a new proker to get started</p>
        </div>
      ) : (
        <>
          {draftFiltered.length > 0 && (
            <section className="space-y-3 mb-8">
              <div className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-amber-500" />
                <h2 className="text-base font-semibold text-foreground">Drafts — finish Lapak Kerja</h2>
                <span className="text-xs text-muted-foreground">{draftFiltered.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                These prokers are hidden from dashboards & analytics until their Lapak Kerja has at least 1 task and 1 link.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {draftFiltered.map((proker) => (
                  <button
                    key={proker.id}
                    type="button"
                    onClick={() => navigate(`/lapak-kerja?proker=${proker.id}`)}
                    className="text-left rounded-lg border border-amber-300/70 bg-amber-50/40 dark:bg-amber-500/5 p-4 hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{proker.nama_proker}</p>
                      <Badge className="bg-amber-500/15 text-amber-700 border-0 text-[10px] shrink-0">Draft</Badge>
                    </div>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1.5 font-medium">Open Lapak Kerja →</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Active Prokers</h2>
              <span className="text-xs text-muted-foreground">{activeFiltered.length}</span>
            </div>
            {activeFiltered.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">No active prokers found</div>
            ) : zoneFilter === "all" ? (
              <div className="space-y-6">
                <ZoneSection
                  title="Red Zone"
                  zoneBadgeClass="bg-red-500/10 text-red-600 border-red-200"
                  prokers={groupedByZone.red}
                  getCreatorName={getCreatorName}
                  onCardClick={handleCardClick}
                />
                <ZoneSection
                  title="Medium Zone"
                  zoneBadgeClass="bg-amber-500/10 text-amber-700 border-amber-200"
                  prokers={groupedByZone.medium}
                  getCreatorName={getCreatorName}
                  onCardClick={handleCardClick}
                />
                <ZoneSection
                  title="Green Zone"
                  zoneBadgeClass="bg-emerald-500/10 text-emerald-700 border-emerald-200"
                  prokers={groupedByZone.green}
                  getCreatorName={getCreatorName}
                  onCardClick={handleCardClick}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paged.map((proker) => (
                  <ProkerCard
                    key={proker.id}
                    proker={proker}
                    creatorName={getCreatorName(proker)}
                    onClick={() => handleCardClick(proker)}
                  />
                ))}
              </div>
            )}
          </section>

          {zoneFilter !== "all" && pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {safePage + 1} of {pageCount} ({activeFiltered.length} active prokers)
              </span>
              <Button variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <section className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Completed Prokers</h2>
              <span className="text-xs text-muted-foreground">{completedFiltered.length}</span>
            </div>

            {completedFiltered.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">No completed prokers yet</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedFiltered.map((proker) => (
                  <ProkerCard
                    key={proker.id}
                    proker={proker}
                    creatorName={getCreatorName(proker)}
                    onClick={() => handleCardClick(proker)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ProkerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        division={division}
        editProker={editProker}
        onCreated={(created) => navigate(`/lapak-kerja?proker=${created.id}`)}
      />
      <ProkerDetail
        proker={selectedProker}
        creatorName={selectedProker ? getCreatorName(selectedProker) : undefined}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
      />
    </div>
  );
}

function ZoneSection({
  title,
  zoneBadgeClass,
  prokers,
  getCreatorName,
  onCardClick,
}: {
  title: string;
  zoneBadgeClass: string;
  prokers: Proker[];
  getCreatorName: (proker: Proker) => string;
  onCardClick: (proker: Proker) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className={zoneBadgeClass}>{title}</Badge>
          <span className="text-xs text-muted-foreground">{prokers.length} prokers</span>
        </div>
      </div>
      {prokers.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">No prokers in this zone</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prokers.map((proker) => (
            <ProkerCard
              key={proker.id}
              proker={proker}
              creatorName={getCreatorName(proker)}
              onClick={() => onCardClick(proker)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
