import { useMemo } from "react";
import { BarChart3, CheckCircle, Clock, Users, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useProkers, DIVISIONS } from "@/hooks/useProkers";
import { useNavigate } from "react-router-dom";

export function DashboardOverview() {
  const { data: prokers, isLoading } = useProkers();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!prokers) return { total: 0, active: 0, complete: 0, totalPeserta: 0, avgProgress: 0 };
    const active = prokers.filter((p) => p.status === "active");
    const complete = prokers.filter((p) => p.status === "complete");
    const avgProgress = prokers.length > 0 ? Math.round(prokers.reduce((sum, p) => sum + p.progress, 0) / prokers.length) : 0;
    return {
      total: prokers.length,
      active: active.length,
      complete: complete.length,
      totalPeserta: prokers.reduce((sum, p) => sum + p.target_peserta, 0),
      avgProgress,
    };
  }, [prokers]);

  const divisionStats = useMemo(() => {
    if (!prokers) return [];
    return DIVISIONS.map((div) => {
      const divProkers = prokers.filter((p) => p.division === div);
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
    { label: "Total Peserta", value: stats.totalPeserta, icon: Users, color: "text-red-accent" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor all divisions and proker progress</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <h2 className="text-lg font-semibold text-foreground">Divisions</h2>
        <p className="text-sm text-muted-foreground">Click a division to view its prokers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
