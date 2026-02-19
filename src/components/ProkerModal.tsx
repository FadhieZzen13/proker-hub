import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProker, useUpdateProker, DIVISIONS, type Proker, type ProkerInsert } from "@/hooks/useProkers";
import { toast } from "sonner";

interface ProkerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division?: string;
  editProker?: Proker | null;
}

export function ProkerModal({ open, onOpenChange, division, editProker }: ProkerModalProps) {
  const [form, setForm] = useState({
    nama_proker: "",
    division: division || "BPH",
    tanggal: new Date().toISOString().split("T")[0],
    target_peserta: 0,
    type: "Internal" as "Internal" | "External",
    progress: 0,
    description: "",
  });

  const createMutation = useCreateProker();
  const updateMutation = useUpdateProker();

  useEffect(() => {
    if (editProker) {
      setForm({
        nama_proker: editProker.nama_proker,
        division: editProker.division,
        tanggal: editProker.tanggal,
        target_peserta: editProker.target_peserta,
        type: editProker.type,
        progress: editProker.progress,
        description: editProker.description || "",
      });
    } else {
      setForm({
        nama_proker: "",
        division: division || "BPH",
        tanggal: new Date().toISOString().split("T")[0],
        target_peserta: 0,
        type: "Internal",
        progress: 0,
        description: "",
      });
    }
  }, [editProker, division, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_proker.trim()) {
      toast.error("Nama Proker is required");
      return;
    }
    try {
      if (editProker) {
        await updateMutation.mutateAsync({ id: editProker.id, ...form });
        toast.success("Proker updated!");
      } else {
        await createMutation.mutateAsync(form as ProkerInsert);
        toast.success("Proker created!");
      }
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">{editProker ? "Edit Proker" : "New Proker"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nama Proker</Label>
            <Input value={form.nama_proker} onChange={(e) => setForm({ ...form, nama_proker: e.target.value })} placeholder="Enter program name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Division</Label>
              <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target Peserta</Label>
              <Input type="number" min={0} value={form.target_peserta} onChange={(e) => setForm({ ...form, target_peserta: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "Internal" | "External" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="External">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Progress</Label>
            <Select value={String(form.progress)} onValueChange={(v) => setForm({ ...form, progress: parseInt(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 25, 50, 75, 100].map((p) => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary text-primary-foreground" disabled={createMutation.isPending || updateMutation.isPending}>
              {editProker ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
