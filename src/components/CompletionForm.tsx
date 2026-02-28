import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateProker, type Proker } from "@/hooks/useProkers";
import { toast } from "sonner";
import { CheckCircle2, Info } from "lucide-react";

interface CompletionFormProps {
  proker: Proker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function CompletionForm({ proker, open, onOpenChange, onComplete }: CompletionFormProps) {
  const [form, setForm] = useState({
    actual_peserta: proker.actual_peserta ?? 0,
    success_factors: proker.success_factors ?? "",
    improvements: proker.improvements ?? "",
    notes: proker.notes ?? "",
  });
  const updateMutation = useUpdateProker();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: proker.id,
        status: "complete",
        progress: 100,
        actual_peserta: form.actual_peserta,
        success_factors: form.success_factors,
        improvements: form.improvements,
        notes: form.notes,
        completed_at: new Date().toISOString(),
      });
      toast.success("Proker marked as complete!");
      onComplete();
    } catch {
      toast.error("Failed to complete proker");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Final Report — {proker.nama_proker}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Peserta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target Peserta</Label>
              <Input value={proker.target_peserta} readOnly className="bg-muted mt-1" />
            </div>
            <div>
              <Label>Actual Peserta</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={form.actual_peserta}
                onChange={(e) => setForm({ ...form, actual_peserta: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label>Success Factors</Label>
            <Textarea
              className="mt-1"
              value={form.success_factors}
              onChange={(e) => setForm({ ...form, success_factors: e.target.value })}
              placeholder="What went well..."
              rows={2}
            />
          </div>
          <div>
            <Label>Improvements</Label>
            <Textarea
              className="mt-1"
              value={form.improvements}
              onChange={(e) => setForm({ ...form, improvements: e.target.value })}
              placeholder="What needs improvement..."
              rows={2}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              className="mt-1"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Hint about engagement/rating tabs */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Engagement metrics and performance rating can be filled in the <strong>Engagement</strong> and <strong>Rating</strong> tabs inside the proker detail view.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-primary-foreground" disabled={updateMutation.isPending}>
              Submit Report & Complete
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}