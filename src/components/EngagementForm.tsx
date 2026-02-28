import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Activity, Users, MessageSquare, Globe } from "lucide-react";
import { type EngagementData, defaultEngagement } from "@/hooks/useProkerAnalytics";
import { toast } from "sonner";

interface EngagementFormProps {
  data: EngagementData;
  onSave?: (data: EngagementData) => void;
  onChange?: (data: EngagementData) => void;
  hideSaveButton?: boolean;
}

export function EngagementForm({ data, onSave, onChange, hideSaveButton }: EngagementFormProps) {
  const [form, setForm] = useState<EngagementData>({ ...defaultEngagement, ...data });

  useEffect(() => {
    setForm({ ...defaultEngagement, ...data });
  }, [data]);

  const updateForm = (next: EngagementData) => {
    setForm(next);
    onChange?.(next);
  };

  const handleSave = () => {
    onSave?.(form);
    toast.success("Engagement data saved");
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Engagement Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3 w-3" />
              Attendance Rate
            </Label>
            <span className="text-sm font-bold text-foreground">{form.attendance_rate}%</span>
          </div>
          <Slider
            value={[form.attendance_rate]}
            onValueChange={([v]) => updateForm({ ...form, attendance_rate: v })}
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Feedback / Satisfaction Score
            </Label>
            <span className="text-sm font-bold text-foreground">{form.feedback_score.toFixed(1)} / 5.0</span>
          </div>
          <Slider
            value={[form.feedback_score * 20]}
            onValueChange={([v]) => updateForm({ ...form, feedback_score: parseFloat((v / 20).toFixed(1)) })}
            max={100}
            min={0}
            step={2}
            className="w-full"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Social Media Reach
          </Label>
          <Input
            type="number"
            min={0}
            value={form.social_media_reach}
            onChange={(e) => updateForm({ ...form, social_media_reach: parseInt(e.target.value) || 0 })}
            placeholder="Total reach"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Other Notes</Label>
          <Textarea
            value={form.other_notes}
            onChange={(e) => updateForm({ ...form, other_notes: e.target.value })}
            placeholder="Additional engagement observations..."
            rows={3}
            className="mt-1"
          />
        </div>

        {!hideSaveButton && (
          <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground" size="sm">
            Save Engagement Data
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
