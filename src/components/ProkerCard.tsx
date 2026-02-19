import { Calendar, ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Proker } from "@/hooks/useProkers";
import { useProkerAnalytics, computeOverallRating } from "@/hooks/useProkerAnalytics";
import { format } from "date-fns";

const progressColors: Record<number, string> = {
  0: "bg-muted",
  25: "bg-red-accent/70",
  50: "bg-gold",
  75: "bg-navy-light",
  100: "bg-green-500",
};

interface ProkerCardProps {
  proker: Proker;
  onClick: () => void;
}

export function ProkerCard({ proker, onClick }: ProkerCardProps) {
  const { analytics } = useProkerAnalytics(proker.id);
  const overallRating = analytics ? computeOverallRating(analytics.rating) : 0;

  return (
    <Card
      className="group cursor-pointer shadow-card hover:shadow-card-hover transition-all duration-200 border-border/60 hover:border-primary/20 animate-fade-in"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{proker.nama_proker}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{proker.division}</p>
          </div>
          <div className="flex gap-1.5 ml-2">
            {overallRating > 0 && (
              <Badge variant="outline" className="gap-0.5 text-[10px] border-yellow-300">
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                {overallRating}
              </Badge>
            )}
            <Badge variant={proker.type === "Internal" ? "default" : "secondary"} className={proker.type === "Internal" ? "bg-primary text-primary-foreground text-[10px]" : "text-[10px]"}>
              {proker.type}
            </Badge>
            {proker.status === "complete" && (
              <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[10px]">Done</Badge>
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
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColors[proker.progress] || "bg-muted"}`}
              style={{ width: `${proker.progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground">{proker.progress}%</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
}
