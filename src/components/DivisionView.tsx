import { useState, useMemo } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProkers, type Proker } from "@/hooks/useProkers";
import { ProkerCard } from "@/components/ProkerCard";
import { ProkerModal } from "@/components/ProkerModal";
import { ProkerDetail } from "@/components/ProkerDetail";
import { Skeleton } from "@/components/ui/skeleton";

interface DivisionViewProps {
  division: string;
}

export function DivisionView({ division }: DivisionViewProps) {
  const { data: prokers, isLoading } = useProkers(division);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProker, setEditProker] = useState<Proker | null>(null);
  const [selectedProker, setSelectedProker] = useState<Proker | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!prokers) return [];
    return prokers.filter((p) => {
      const matchSearch = p.nama_proker.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || p.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [prokers, search, typeFilter]);

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
          <Input placeholder="Search prokers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proker) => (
            <ProkerCard key={proker.id} proker={proker} onClick={() => handleCardClick(proker)} />
          ))}
        </div>
      )}

      <ProkerModal open={modalOpen} onOpenChange={setModalOpen} division={division} editProker={editProker} />
      <ProkerDetail proker={selectedProker} open={detailOpen} onOpenChange={setDetailOpen} onEdit={handleEdit} />
    </div>
  );
}
