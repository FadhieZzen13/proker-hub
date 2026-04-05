import { Calendar, ArrowRight, Star, Repeat2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Proker } from "@/hooks/useProkers";
import { useProkerAnalytics, computeOverallRating } from "@/hooks/useProkerAnalytics";
import { useInternalRatings, averageInternalRating } from "@/hooks/useInternalRatings";
import { useBerkelanjutanEntries, CATEGORY_LABELS, type BerkelanjutanCategory } from "@/hooks/useBerkelanjutan";
import { format } from "date-fns";

const zoneBadgeClass: Record<Proker["current_zone"], string> = {
  red: "bg-red-500/10 text-red-600 border-red-200",
  medium: "bg-amber-500/10 text-amber-700 border-amber-200",
  green: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

const zoneLabel: Record<Proker["current_zone"], string> = {
  red: "Red Zone",
  medium: "Medium Zone",
  green: "Green Zone",
};

const zoneCardClass: Record<Proker["current_zone"], string> = {
  red: "border-2 border-red-400/90 bg-gradient-to-br from-red-100/90 via-red-50/70 to-white hover:border-red-500",
  medium: "border-2 border-amber-400/90 bg-gradient-to-br from-amber-100/90 via-amber-50/70 to-white hover:border-amber-500",
  green: "border-2 border-emerald-400/90 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-white hover:border-emerald-500",
};

const zoneStripeClass: Record<Proker["current_zone"], string> = {
  red: "bg-red-500",
  medium: "bg-amber-500",
  green: "bg-emerald-500",
};

const getProgressColor = (progress: number): string => {
  if (progress >= 100) return "bg-green-500";
  if (progress >= 75) return "bg-navy-light";
  if (progress >= 50) return "bg-gold";
  if (progress >= 25) return "bg-red-accent/70";
  return "bg-muted";
};

interface ProkerCardProps {
  proker: Proker;
  creatorName?: string;
  onClick: () => void;
}

export function ProkerCard({ proker, creatorName, onClick }: ProkerCardProps) {
  const { analytics } = useProkerAnalytics(proker);
  const overallRating = analytics ? computeOverallRating(analytics.rating) : 0;
  const { data: peerRatings = [] } = useInternalRatings(proker.id);
  const peerAvg = averageInternalRating(peerRatings);
  const isBerk = proker.is_berkelanjutan;
  const cat = proker.berkelanjutan_category as BerkelanjutanCategory | null;
  const { data: bEntries = [] } = useBerkelanjutanEntries(isBerk ? proker.id : "");
  const cardZoneClass = zoneCardClass[proker.current_zone];

  // Summary stat for berkelanjutan card
  const bStat = (() => {
    if (!isBerk || !cat || bEntries.length === 0) return null;
    if (cat === "finance") {
      const totalActual = bEntries.reduce((s, e) => s + (e.actual_income ?? 0), 0);
      return `RM ${totalActual.toLocaleString()}`;
    }
    if (cat === "response") {
      const vals = bEntries.map((e) => e.response_time_minutes).filter((v): v is number => v != null);
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0) : null;
      return avg ? `${avg} min avg` : null;
    }
    if (cat === "outreach") {
      const reach = bEntries.reduce((s, e) => s + (e.total_reach ?? 0), 0);
      return `${reach.toLocaleString()} reach`;
    }
    if (cat === "people") {
      const given = bEntries.reduce((s, e) => s + (e.meals_given_out ?? 0), 0);
      return `${given} meals`;
    }
    return null;
  })();

  return (
    <Card
      className={`group cursor-pointer overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 animate-fade-in ${cardZoneClass} ${isBerk ? "border-l-4 border-l-blue-500" : ""}`}
      onClick={onClick}
    >
      <div className={`h-1.5 w-full ${zoneStripeClass[proker.current_zone]}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{proker.nama_proker}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-muted-foreground">{proker.division}</p>
              {proker.collab_divisions?.length > 0 && (
                <span className="text-xs text-muted-foreground">+ {proker.collab_divisions.join(", ")}</span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 ml-2 flex-wrap justify-end">
            {isBerk && (
              <Badge variant="outline" className="gap-0.5 text-[10px] border-blue-300 text-blue-600">
                <Repeat2 className="h-2.5 w-2.5" /> Ongoing
              </Badge>
            )}
            {overallRating > 0 && (
              <Badge variant="outline" className="gap-0.5 text-[10px] border-yellow-300">
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                {overallRating}
              </Badge>
            )}
            {peerAvg > 0 && (
              <Badge variant="outline" className="gap-0.5 text-[10px] border-purple-300 text-purple-600">
                <Star className="h-2.5 w-2.5 fill-purple-400 text-purple-400" />
                {peerAvg} internal
              </Badge>
            )}
            <Badge variant={proker.type === "Internal" ? "default" : "secondary"} className={proker.type === "Internal" ? "bg-primary text-primary-foreground text-[10px]" : "text-[10px]"}>
              {proker.type}
            </Badge>
            {!isBerk && proker.status === "complete" && (
              <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[10px]">Done</Badge>
            )}
            {proker.status === "active" && (
              <Badge className={`${zoneBadgeClass[proker.current_zone]} text-[10px]`}>{zoneLabel[proker.current_zone]}</Badge>
            )}
          </div>
        </div>

        {proker.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{proker.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(proker.tanggal), "dd MMM yyyy")}
          </span>
          {creatorName && <span>By {creatorName}</span>}
          {isBerk && cat && (
            <span className="text-[10px] text-blue-600">{CATEGORY_LABELS[cat]}</span>
          )}
          {isBerk && bStat && (
            <span className="font-medium text-foreground">{bStat}</span>
          )}
          {isBerk && bEntries.length > 0 && (
            <span className="text-muted-foreground">{bEntries.length} entries</span>
          )}
        </div>

        {!isBerk && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(proker.progress)}`}
                style={{ width: `${proker.progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground">{proker.progress}%</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        {isBerk && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-400 animate-pulse" style={{ width: "100%" }} />
            </div>
            <span className="text-xs font-semibold text-blue-600">Ongoing</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
