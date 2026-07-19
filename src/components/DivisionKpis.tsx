import { useState } from "react";
import { Target, Pencil, Trash2, Plus, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useDivisionKpis, type DivisionKpi } from "@/hooks/useDivisionKpis";
import { toast } from "sonner";

function KpiRow({ kpi, canEdit, onUpdate, onDelete }: {
  kpi: DivisionKpi;
  canEdit: boolean;
  onUpdate: (id: string, patch: Partial<DivisionKpi>) => void;
  onDelete: (id: string) => void;
}) {
  const pct = kpi.target > 0 ? Math.min(100, Math.round((kpi.current / kpi.target) * 100)) : 0;
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(String(kpi.current));

  const save = () => {
    onUpdate(kpi.id, { current: Number(current) || 0 });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{kpi.label}</p>
          <p className="text-xs text-muted-foreground">
            {Number(kpi.current)} / {Number(kpi.target)} {kpi.unit}
          </p>
        </div>
        {canEdit && !editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => { setCurrent(String(kpi.current)); setEditing(true); }}><Pencil className="h-3.5 w-3.5" /></button>
            <button className="p-1 text-muted-foreground hover:text-destructive" onClick={() => onDelete(kpi.id)}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-foreground w-9 text-right">{pct}%</span>
      </div>
      {editing && (
        <div className="mt-2 flex items-center gap-2">
          <Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-8 text-xs" />
          <Button size="sm" className="h-8" onClick={save}><Check className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
}

export function DivisionKpis({ division, canEdit }: { division: string; canEdit: boolean }) {
  const { kpis, loading, addKpi, updateKpi, deleteKpi } = useDivisionKpis(division);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", target: "", current: "", unit: "" });

  const handleAdd = async () => {
    if (!form.label.trim() || !form.target) { toast.error("Label and target are required"); return; }
    try {
      await addKpi({
        division,
        label: form.label.trim(),
        target: Number(form.target) || 0,
        current: Number(form.current) || 0,
        unit: form.unit.trim(),
        sort: kpis.length,
      });
      toast.success("KPI added");
      setForm({ label: "", target: "", current: "", unit: "" });
      setAdding(false);
    } catch {
      toast.error("Failed to add KPI");
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{division} KPI Targets</h2>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : kpis.length === 0 ? (
          <p className="text-sm text-muted-foreground">No KPI targets set yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kpis.map((k) => (
              <KpiRow key={k.id} kpi={k} canEdit={canEdit} onUpdate={updateKpi} onDelete={deleteKpi} />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add KPI Target</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Label</Label>
              <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Event attendees" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target</Label>
                <Input type="number" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Current</Label>
                <Input type="number" value={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unit (optional)</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="e.g. people, RM, posts" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
