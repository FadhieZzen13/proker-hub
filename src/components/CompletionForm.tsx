import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateProker, type Proker } from "@/hooks/useProkers";
import { toast } from "sonner";

interface CompletionFormProps {
  proker: Proker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function CompletionForm({ proker, open, onOpenChange, onComplete }: CompletionFormProps) {
  const [form, setForm] = useState({
    actual_peserta: 0,
    success_factors: "",
    improvements: "",
    notes: "",
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
          <DialogTitle className="text-foreground">Final Report — {proker.nama_proker}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Predicted Peserta (Target)</Label>
            <Input value={proker.target_peserta} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>Actual Peserta</Label>
            <Input type="number" min={0} value={form.actual_peserta} onChange={(e) => setForm({ ...form, actual_peserta: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Success Factors</Label>
            <Textarea value={form.success_factors} onChange={(e) => setForm({ ...form, success_factors: e.target.value })} placeholder="What went well..." rows={3} />
          </div>
          <div>
            <Label>Improvements</Label>
            <Textarea value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} placeholder="What needs improvement..." rows={3} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
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
