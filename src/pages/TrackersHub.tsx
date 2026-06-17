import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid, ClipboardList, Award, ArrowRight } from "lucide-react";

const TRACKERS = [
  {
    to: "/tracker",
    title: "Personal Tracker",
    desc: "Catatan kerjaan bulanan per anggota — 'udah ngerjain apa aja?' beserta progress-nya.",
    icon: ClipboardList,
    accent: "text-blue-600",
    ring: "group-hover:border-blue-300",
  },
  {
    to: "/evaluation",
    title: "Evaluasi Kinerja",
    desc: "Penilaian Best Member (oleh Kadep/Wakadep) & Best Kadep/Wakadep (oleh BPH).",
    icon: Award,
    accent: "text-amber-600",
    ring: "group-hover:border-amber-300",
  },
];

export default function TrackersHub() {
  const navigate = useNavigate();
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Trackers</h1>
        </div>
        <p className="text-sm text-muted-foreground">Pusat semua tracker — pilih salah satu untuk membuka.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TRACKERS.map((t) => (
          <Card
            key={t.to}
            className={`group cursor-pointer border-border/60 transition-colors ${t.ring}`}
            onClick={() => navigate(t.to)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <t.icon className={`h-6 w-6 ${t.accent}`} />
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h2 className="text-base font-semibold text-foreground">{t.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
