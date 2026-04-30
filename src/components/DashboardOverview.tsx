import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle, Clock, TrendingUp, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProkers, DIVISIONS } from "@/hooks/useProkers";
import { useNavigate } from "react-router-dom";
import { ProkerAnalyticsDashboard } from "@/components/ProkerAnalyticsDashboard";
import { useBhepSubmissions } from "@/hooks/useBhepSubmissions";
import { format } from "date-fns";

export function DashboardOverview() {
  const { data: prokers, isLoading } = useProkers();
  const { data: bhepSubmissions = [] } = useBhepSubmissions();
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<"red" | "medium" | "green" | null>(null);
  const [showKasPopup, setShowKasPopup] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("ppi_bayar_kas_popup_dismissed") === "1";
    if (!dismissed) setShowKasPopup(true);
  }, []);

  const closeKasPopup = () => {
    localStorage.setItem("ppi_bayar_kas_popup_dismissed", "1");
    setShowKasPopup(false);
  };

  const stats = useMemo(() => {
    if (!prokers) return { total: 0, active: 0, complete: 0, avgProgress: 0 };
    const active = prokers.filter((p) => p.status === "active");
    const complete = prokers.filter((p) => p.status === "complete");
    const avgProgress = prokers.length > 0 ? Math.round(prokers.reduce((sum, p) => sum + p.progress, 0) / prokers.length) : 0;
    return {
      total: prokers.length,
      active: active.length,
      complete: complete.length,
      avgProgress,
    };
  }, [prokers]);

  const divisionStats = useMemo(() => {
    if (!prokers) return [];
    return DIVISIONS.map((div) => {
      const divProkers = prokers.filter(
        (p) => p.division === div || (p.collab_divisions ?? []).includes(div)
      );
      const active = divProkers.filter((p) => p.status === "active").length;
      const complete = divProkers.filter((p) => p.status === "complete").length;
      const avg = divProkers.length > 0 ? Math.round(divProkers.reduce((s, p) => s + p.progress, 0) / divProkers.length) : 0;
      return { division: div, total: divProkers.length, active, complete, avgProgress: avg };
    });
  }, [prokers]);

  const statCards = [
    { label: "Total Prokers", value: stats.total, icon: BarChart3, color: "text-primary" },
    { label: "Active", value: stats.active, icon: Clock, color: "text-gold" },
    { label: "Completed", value: stats.complete, icon: CheckCircle, color: "text-green-600" },
  ];

  const zoneData = useMemo(() => {
    const source = (prokers ?? []).filter((p) => p.status === "active");
    return {
      red: source.filter((p) => p.current_zone === "red"),
      medium: source.filter((p) => p.current_zone === "medium"),
      green: source.filter((p) => p.current_zone === "green"),
    };
  }, [prokers]);

  const zoneMeta: Record<"red" | "medium" | "green", { title: string; cardClass: string; badgeClass: string }> = {
    red: {
      title: "Red Zone",
      cardClass: "border-red-300 bg-gradient-to-br from-red-100/90 to-red-50/70 hover:border-red-400",
      badgeClass: "bg-red-500/10 text-red-600 border-red-200",
    },
    medium: {
      title: "Medium Zone",
      cardClass: "border-amber-300 bg-gradient-to-br from-amber-100/90 to-amber-50/70 hover:border-amber-400",
      badgeClass: "bg-amber-500/10 text-amber-700 border-amber-200",
    },
    green: {
      title: "Green Zone",
      cardClass: "border-emerald-300 bg-gradient-to-br from-emerald-100/90 to-emerald-50/70 hover:border-emerald-400",
      badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    },
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Dialog open={showKasPopup} onOpenChange={(open) => { if (!open) closeKasPopup(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">BAYAR KAS!!!</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center">
            Friendly reminder to pay your kas. Please complete your payment as soon as possible.
          </p>
          <div className="flex justify-center pt-2">
            <Button onClick={closeKasPopup}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor all divisions and proker progress</p>
      </div>

      <Card className="border-border/60 mb-8">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Submission Proposal BHEP</h2>
            </div>
            <Badge variant="secondary" className="text-xs">{bhepSubmissions.length} dates</Badge>
          </div>
          {bhepSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submission dates available.</p>
          ) : (
            <div className="space-y-2">
              {bhepSubmissions.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="text-muted-foreground">{format(new Date(item.submission_date), "dd MMM yyyy")}</span>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {item.link}
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-card border-border/60 animate-fade-in">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Zone Overview</h2>
        <p className="text-sm text-muted-foreground">Active prokers only. Hover a zone for quick preview, click to pin full list</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {(["red", "medium", "green"] as const).map((zoneKey) => {
          const item = zoneData[zoneKey];
          const meta = zoneMeta[zoneKey];
          const isSelected = selectedZone === zoneKey;
          return (
            <HoverCard key={zoneKey} openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Card
                  className={`cursor-pointer border-2 shadow-card transition-all ${meta.cardClass} ${isSelected ? "ring-2 ring-primary/40" : ""}`}
                  onClick={() => setSelectedZone((prev) => (prev === zoneKey ? null : zoneKey))}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={meta.badgeClass}>{meta.title}</Badge>
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : item.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total prokers in this zone</p>
                  </CardContent>
                </Card>
              </HoverCardTrigger>
              <HoverCardContent className="w-80" align="start">
                <p className="text-sm font-semibold mb-2">{meta.title} Prokers</p>
                {item.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No prokers in this zone</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {item.map((proker) => (
                      <div key={proker.id} className="rounded-md border border-border/60 p-2">
                        <p className="text-sm font-medium text-foreground truncate">{proker.nama_proker}</p>
                        <p className="text-xs text-muted-foreground">{proker.division} · {proker.status === "complete" ? "Complete" : "Active"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>

      {selectedZone && (
        <div className="mb-8 rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge className={zoneMeta[selectedZone].badgeClass}>{zoneMeta[selectedZone].title} List</Badge>
            <span className="text-xs text-muted-foreground">{zoneData[selectedZone].length} prokers</span>
          </div>
          {zoneData[selectedZone].length === 0 ? (
            <p className="text-sm text-muted-foreground">No prokers in this zone.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {zoneData[selectedZone].map((proker) => (
                <button
                  key={proker.id}
                  type="button"
                  className="text-left rounded-md border border-border/70 bg-background p-3 hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/division/${proker.division}`)}
                >
                  <p className="text-sm font-semibold text-foreground truncate">{proker.nama_proker}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{proker.division} · {proker.status === "complete" ? "Complete" : "Active"}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Divisions</h2>
        <p className="text-sm text-muted-foreground">Click a division to view its prokers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {divisionStats.map((d) => (
          <Card
            key={d.division}
            className="shadow-card hover:shadow-card-hover transition-all cursor-pointer border-border/60 hover:border-primary/20 animate-fade-in"
            onClick={() => navigate(`/division/${d.division}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-foreground">{d.division}</h3>
                <span className="text-xs text-muted-foreground">{d.total} prokers</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${d.avgProgress}%` }} />
                </div>
                <span className="text-xs font-semibold text-foreground">{d.avgProgress}%</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{d.active} active</span>
                <span>{d.complete} done</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Proker Analytics Section */}
      <ProkerAnalyticsDashboard />
    </div>
  );
}
