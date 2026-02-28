import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { type RatingData, defaultRating, computeOverallRating } from "@/hooks/useProkerAnalytics";
import { toast } from "sonner";

const CRITERIA = [
  { key: "planning" as const, label: "Planning & Preparation", desc: "How well was the proker planned?" },
  { key: "execution" as const, label: "Execution & Implementation", desc: "Quality of execution during the event" },
  { key: "impact" as const, label: "Impact & Outcomes", desc: "Measurable results and impact" },
  { key: "creativity" as const, label: "Creativity & Innovation", desc: "Originality and creative approach" },
  { key: "teamwork" as const, label: "Teamwork & Collaboration", desc: "Team coordination and collaboration" },
];

interface RatingFormProps {
  data: RatingData;
  onSave?: (data: RatingData) => void;
  onChange?: (data: RatingData) => void;
  hideSaveButton?: boolean;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="focus:outline-none transition-transform hover:scale-110"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star === value ? 0 : star)}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function RatingForm({ data, onSave, onChange, hideSaveButton }: RatingFormProps) {
  const [form, setForm] = useState<RatingData>({ ...defaultRating, ...data });

  useEffect(() => {
    setForm({ ...defaultRating, ...data });
  }, [data]);

  const updateForm = (next: RatingData) => {
    setForm(next);
    onChange?.(next);
  };

  const overall = computeOverallRating(form);

  const handleSave = () => {
    onSave?.(form);
    toast.success("Rating saved");
  };

  const getScoreLabel = (score: number): string => {
    if (score === 0) return "Not rated";
    if (score <= 1) return "Poor";
    if (score <= 2) return "Below Average";
    if (score <= 3) return "Average";
    if (score <= 4) return "Good";
    return "Excellent";
  };

  const getScoreColor = (score: number): string => {
    if (score === 0) return "text-muted-foreground";
    if (score <= 2) return "text-red-500";
    if (score <= 3) return "text-yellow-500";
    if (score <= 4) return "text-blue-500";
    return "text-green-500";
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            Performance Rating
          </CardTitle>
          {overall > 0 && (
            <div className="text-right">
              <span className={`text-2xl font-bold ${getScoreColor(overall)}`}>{overall}</span>
              <span className="text-sm text-muted-foreground"> / 5.0</span>
              <p className={`text-xs ${getScoreColor(overall)}`}>{getScoreLabel(overall)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {CRITERIA.map((c) => (
          <div key={c.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-foreground">{c.label}</Label>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
              <span className={`text-xs font-semibold ${getScoreColor(form[c.key])}`}>
                {form[c.key] > 0 ? `${form[c.key]}/5` : "—"}
              </span>
            </div>
            <StarRating value={form[c.key]} onChange={(v) => updateForm({ ...form, [c.key]: v })} />
          </div>
        ))}

        {!hideSaveButton && (
          <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground" size="sm">
            Save Rating
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
