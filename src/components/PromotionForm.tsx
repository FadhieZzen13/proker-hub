import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Share2, X, Plus } from "lucide-react";
import { type PromotionData, defaultPromotion } from "@/hooks/useProkerAnalytics";
import { toast } from "sonner";

const PRESET_PLATFORMS = ["Instagram", "WhatsApp", "Twitter/X", "TikTok", "YouTube", "Telegram", "Facebook", "Line", "Email"];

interface PromotionFormProps {
  data: PromotionData;
  onSave: (data: PromotionData) => void;
}

export function PromotionForm({ data, onSave }: PromotionFormProps) {
  const [form, setForm] = useState<PromotionData>({ ...defaultPromotion, ...data });
  const [newGroup, setNewGroup] = useState("");

  useEffect(() => {
    setForm({ ...defaultPromotion, ...data });
  }, [data]);

  const addGroup = () => {
    const g = newGroup.trim();
    if (g && !form.groups_shared.includes(g)) {
      setForm({ ...form, groups_shared: [...form.groups_shared, g] });
      setNewGroup("");
    }
  };

  const removeGroup = (group: string) => {
    setForm({ ...form, groups_shared: form.groups_shared.filter((g) => g !== group) });
  };

  const togglePlatform = (platform: string) => {
    setForm({
      ...form,
      platforms: form.platforms.includes(platform)
        ? form.platforms.filter((p) => p !== platform)
        : [...form.platforms, platform],
    });
  };

  const handleSave = () => {
    onSave(form);
    toast.success("Promotion data saved");
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Promotion Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Views of Promotional Materials</Label>
          <Input
            type="number"
            min={0}
            value={form.views}
            onChange={(e) => setForm({ ...form, views: parseInt(e.target.value) || 0 })}
            placeholder="Total views"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Platforms Shared On</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESET_PLATFORMS.map((p) => (
              <Badge
                key={p}
                variant={form.platforms.includes(p) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  form.platforms.includes(p) ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
                onClick={() => togglePlatform(p)}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Share2 className="h-3 w-3" />
            Groups Shared To
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="Add group name..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGroup())}
            />
            <Button type="button" size="sm" variant="outline" onClick={addGroup}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {form.groups_shared.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.groups_shared.map((g) => (
                <Badge key={g} variant="secondary" className="gap-1">
                  {g}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeGroup(g)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground" size="sm">
          Save Promotion Data
        </Button>
      </CardContent>
    </Card>
  );
}
