import { useState, useMemo } from "react";
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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

const PAGE_SIZE = 9;

interface DivisionViewProps {
  division: string;
}

export function DivisionView({ division }: DivisionViewProps) {
  const { data: prokers, isLoading } = useProkers(division);
  const { members } = useMemberStore();
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
    const zoneRank: Record<Proker["current_zone"], number> = { red: 0, medium: 1, green: 2 };

    return prokers.filter((p) => {
      const matchSearch = p.nama_proker.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || p.type === typeFilter;
      const matchZone = zoneFilter === "all" || p.current_zone === zoneFilter;
      return matchSearch && matchType && matchZone;
    }).sort((a, b) => zoneRank[a.current_zone] - zoneRank[b.current_zone]);
  }, [prokers, search, typeFilter, zoneFilter]);

  const memberNameById = useMemo(() => {
    return Object.fromEntries(members.map((member) => [member.id, member.name]));
  }, [members]);

  const getCreatorName = (proker: Proker) => {
    if (!proker.created_by_member_id) return "Legacy proker";
    return memberNameById[proker.created_by_member_id] ?? "Unknown member";
  };

  // Reset page when filters change
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = zoneFilter === "all"
    ? filtered
    : filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const groupedByZone = useMemo(() => {
    return {
      red: paged.filter((p) => p.current_zone === "red"),
      medium: paged.filter((p) => p.current_zone === "medium"),
      green: paged.filter((p) => p.current_zone === "green"),
    };
  }, [paged]);

  const handleEdit = (proker: Proker) => {
    setEditProker(proker);
    setModalOpen(true);
  };

  const handleCardClick = (proker: Proker) => {
    setSelectedProker(proker);
    setDetailOpen(true);
  };

  const activeCount = prokers?.filter((p) => p.status === "active").length ?? 0;
  const completeCount = prokers?.filter((p) => p.status === "complete").length ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Division {division}</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeCount} active · {completeCount} completed</p>
        </div>
        <Button onClick={() => { setEditProker(null); setModalOpen(true); }} className="bg-primary text-primary-foreground">
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No prokers found</p>
          <p className="text-sm mt-1">Create a new proker to get started</p>
        </div>
      ) : (
        <>
          {zoneFilter === "all" ? (
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

          {zoneFilter !== "all" && pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {safePage + 1} of {pageCount} ({filtered.length} prokers)
              </span>
              <Button variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <ProkerModal open={modalOpen} onOpenChange={setModalOpen} division={division} editProker={editProker} />
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
