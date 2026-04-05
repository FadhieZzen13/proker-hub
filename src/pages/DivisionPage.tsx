import { useState } from "react";
import { useParams } from "react-router-dom";
import { DivisionView } from "@/components/DivisionView";
import { DivisionMeetingsSection } from "@/components/DivisionMeetingsSection";
import { DIVISIONS } from "@/hooks/useProkers";

const DivisionPage = () => {
  const { division } = useParams<{ division: string }>();
  const [mode, setMode] = useState<"prokers" | "meetings">("prokers");
  
  if (!division || !DIVISIONS.includes(division as any)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Division not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-5">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${mode === "prokers" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            onClick={() => setMode("prokers")}
          >
            Prokers
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${mode === "meetings" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            onClick={() => setMode("meetings")}
          >
            Meetings
          </button>
        </div>
      </div>

      {mode === "prokers" ? <DivisionView division={division} /> : <DivisionMeetingsSection division={division} />}
    </div>
  );
};

export default DivisionPage;
