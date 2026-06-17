import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useCreateProker, useUpdateProker, DIVISIONS, EMPTY_PROKER_ZONE, type CustomParam, type Proker, type ProkerCurrentZone, type ProkerInsert, type ProkerZone } from "@/hooks/useProkers";
import { useMemberStore } from "@/hooks/useMemberStore";
import { pushDashboardNotification } from "@/hooks/useDashboardNotifications";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { CATEGORY_LABELS } from "@/hooks/useBerkelanjutan";

interface ProkerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division?: string;
  editProker?: Proker | null;
  onCreated?: (proker: Proker) => void;
}

export function ProkerModal({ open, onOpenChange, division, editProker, onCreated }: ProkerModalProps) {
  const [form, setForm] = useState({
    nama_proker: "",
    division: division || "BPH",
    collab_divisions: [] as string[],
    tanggal: new Date().toISOString().split("T")[0],
    target_peserta: 0,
    type: "Internal" as "Internal" | "External",
    progress: 0,
    description: "",
    is_berkelanjutan: false,
    berkelanjutan_category: "" as string,
    berkelanjutan_notes: "",
    custom_params: [] as CustomParam[],
    current_zone: "green" as ProkerCurrentZone,
    red_zone: { ...EMPTY_PROKER_ZONE } as ProkerZone,
    medium_zone: { ...EMPTY_PROKER_ZONE } as ProkerZone,
    green_zone: { ...EMPTY_PROKER_ZONE } as ProkerZone,
  });

  const createMutation = useCreateProker();
  const updateMutation = useUpdateProker();
  const { currentMember, isAdmin } = useMemberStore();

  useEffect(() => {
    if (editProker) {
      setForm({
        nama_proker: editProker.nama_proker,
        division: editProker.division,
        collab_divisions: editProker.collab_divisions ?? [],
        tanggal: editProker.tanggal,
        target_peserta: editProker.target_peserta,
        type: editProker.type,
        progress: editProker.progress,
        description: editProker.description || "",
        is_berkelanjutan: editProker.is_berkelanjutan ?? false,
        berkelanjutan_category: editProker.berkelanjutan_category ?? "",
        berkelanjutan_notes: editProker.berkelanjutan_notes || "",
        custom_params: editProker.custom_params ?? [],
        current_zone: editProker.current_zone,
        red_zone: editProker.red_zone,
        medium_zone: editProker.medium_zone,
        green_zone: editProker.green_zone,
      });
    } else {
      setForm({
        nama_proker: "",
        division: division || "BPH",
        collab_divisions: [],
        tanggal: new Date().toISOString().split("T")[0],
        target_peserta: 0,
        type: "Internal",
        progress: 0,
        description: "",
        is_berkelanjutan: false,
        berkelanjutan_category: "",
        berkelanjutan_notes: "",
        custom_params: [],
        current_zone: "green",
        red_zone: { ...EMPTY_PROKER_ZONE },
        medium_zone: { ...EMPTY_PROKER_ZONE },
        green_zone: { ...EMPTY_PROKER_ZONE },
      });
    }
  }, [editProker, division, open]);

  const updateZone = (zone: "red_zone" | "medium_zone" | "green_zone", field: keyof ProkerZone, value: string | null) => {
    setForm((prev) => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        [field]: value,
      },
    }));
  };

  const toggleCollab = (div: string) => {
    setForm((f) => ({
      ...f,
      collab_divisions: f.collab_divisions.includes(div)
        ? f.collab_divisions.filter((d) => d !== div)
        : [...f.collab_divisions, div],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      const memberDivision = currentMember?.division;
      if (editProker) {
        const canEdit = !!memberDivision && (editProker.division === memberDivision || (editProker.collab_divisions ?? []).includes(memberDivision));
        if (!canEdit) {
          toast.error("You can only edit prokers in your division");
          return;
        }
      } else if (!memberDivision || memberDivision !== form.division) {
        toast.error("You can only create prokers in your division");
        return;
      }
    }
    if (!form.nama_proker.trim()) {
      toast.error("Nama Proker is required");
      return;
    }
    // collab divisions must not include the primary division
    const collab = form.collab_divisions.filter((d) => d !== form.division);

    // Custom-category prokers define their own metrics; drop empty rows and
    // only persist params when the Custom category is actually selected.
    const isCustom = form.is_berkelanjutan && form.berkelanjutan_category === "custom";
    const cleanedParams: CustomParam[] = isCustom
      ? form.custom_params.map((p) => ({ ...p, label: p.label.trim() })).filter((p) => p.label.length > 0)
      : [];
    if (isCustom && cleanedParams.length === 0) {
      toast.error("Add at least one custom parameter (give it a label).");
      return;
    }

    const payload = {
      ...form,
      collab_divisions: collab,
      berkelanjutan_category: form.berkelanjutan_category || null,
      custom_params: cleanedParams,
    };
    try {
      if (editProker) {
        await updateMutation.mutateAsync({ id: editProker.id, ...payload });
        pushDashboardNotification("edited", {
          prokerId: editProker.id,
          prokerName: payload.nama_proker,
          division: payload.division,
          message: `Proker updated in ${payload.division}`,
        });
        toast.success("Proker updated!");
      } else {
        const created = await createMutation.mutateAsync({
          ...payload,
          created_by_member_id: currentMember?.id ?? null,
        } as ProkerInsert);
        pushDashboardNotification("created", {
          prokerId: created.id,
          prokerName: created.nama_proker,
          division: created.division,
          message: `New proker created in ${created.division}`,
        });
        toast.success("Proker created! Complete its Lapak Kerja to activate it.");
        onOpenChange(false);
        onCreated?.(created);
        return;
      }
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const availableCollabDivisions = DIVISIONS.filter((d) => d !== form.division);
  const selectedZoneKey = `${form.current_zone}_zone` as "red_zone" | "medium_zone" | "green_zone";
  const selectedZone = form[selectedZoneKey];

  const zoneMeta: Record<ProkerCurrentZone, { label: string; toneClass: string }> = {
    red: { label: "Red Zone", toneClass: "text-red-600" },
    medium: { label: "Medium Zone", toneClass: "text-amber-600" },
    green: { label: "Green Zone", toneClass: "text-emerald-600" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              <Label>Primary Division</Label>
              <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v, collab_divisions: form.collab_divisions.filter((d) => d !== v) })}>
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

          {/* Collab Divisions */}
          <div>
            <Label className="text-sm">Collaboration Divisions <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {availableCollabDivisions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleCollab(d)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.collab_divisions.includes(d)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            {form.collab_divisions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.collab_divisions.filter((d) => d !== form.division).map((d) => (
                  <Badge key={d} variant="secondary" className="gap-1 text-xs">
                    {d}
                    <button type="button" onClick={() => toggleCollab(d)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {!form.is_berkelanjutan && (
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
          )}
          {form.is_berkelanjutan && (
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
          )}
          {!form.is_berkelanjutan && (
            <p className="text-xs text-muted-foreground">
              Progress is now managed using dated progress logs from the proker detail view.
            </p>
          )}
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." rows={3} />
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div>
              <Label className="text-sm font-medium">Progress Zones</Label>
              <p className="text-xs text-muted-foreground">Pick current zone, then fill status, problem, way out, action, and deadline.</p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Current Zone</Label>
              <Select
                value={form.current_zone}
                onValueChange={(v) => setForm({ ...form, current_zone: v as ProkerCurrentZone })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="red">Red Zone</SelectItem>
                  <SelectItem value="medium">Medium Zone</SelectItem>
                  <SelectItem value="green">Green Zone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ZoneEditorCard
              title={zoneMeta[form.current_zone].label}
              toneClass={zoneMeta[form.current_zone].toneClass}
              zone={selectedZone}
              onChange={(field, value) => updateZone(selectedZoneKey, field, value)}
            />
          </div>

          {/* Berkelanjutan toggle */}
          <div className="rounded-lg border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Proker Berkelanjutan</Label>
                <p className="text-xs text-muted-foreground">Ongoing program that runs continuously</p>
              </div>
              <Switch
                checked={form.is_berkelanjutan}
                onCheckedChange={(v) => setForm({ ...form, is_berkelanjutan: v })}
              />
            </div>
            {form.is_berkelanjutan && (
              <div className="space-y-2 pt-1">
                <div>
                  <Label className="text-xs text-muted-foreground">Tracker Category</Label>
                  <Select value={form.berkelanjutan_category} onValueChange={(v) => setForm({ ...form, berkelanjutan_category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(CATEGORY_LABELS) as [string, string][]).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.berkelanjutan_category === "custom" && (
                  <div className="rounded-md border border-border/60 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Custom Parameters</Label>
                      <Button
                        type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs"
                        onClick={() => setForm((f) => ({
                          ...f,
                          custom_params: [...f.custom_params, { key: `p_${Date.now()}_${f.custom_params.length}`, label: "", type: "number" }],
                        }))}
                      >
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                    {form.custom_params.length === 0 ? (
                      <p className="text-xs text-muted-foreground/70">Define the metrics you want to log each session (e.g. "Books distributed", number).</p>
                    ) : (
                      form.custom_params.map((p, idx) => (
                        <div key={p.key} className="flex items-center gap-2">
                          <Input
                            className="h-8 flex-1" placeholder="Metric label (e.g. Books distributed)"
                            value={p.label}
                            onChange={(e) => setForm((f) => ({
                              ...f,
                              custom_params: f.custom_params.map((x, i) => i === idx ? { ...x, label: e.target.value } : x),
                            }))}
                          />
                          <Select
                            value={p.type}
                            onValueChange={(v) => setForm((f) => ({
                              ...f,
                              custom_params: f.custom_params.map((x, i) => i === idx ? { ...x, type: v as CustomParam["type"] } : x),
                            }))}
                          >
                            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setForm((f) => ({ ...f, custom_params: f.custom_params.filter((_, i) => i !== idx) }))}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <Textarea
                  value={form.berkelanjutan_notes}
                  onChange={(e) => setForm({ ...form, berkelanjutan_notes: e.target.value })}
                  placeholder="Notes about this ongoing program..."
                  rows={2}
                />
              </div>
            )}
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

function ZoneEditorCard({
  title,
  toneClass,
  zone,
  onChange,
}: {
  title: string;
  toneClass: string;
  zone: ProkerZone;
  onChange: (field: keyof ProkerZone, value: string | null) => void;
}) {
  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wider ${toneClass}`}>{title}</p>
      <Input
        placeholder="Current status"
        value={zone.current_status}
        onChange={(e) => onChange("current_status", e.target.value)}
      />
      <Textarea
        placeholder="Current problem"
        value={zone.current_problem}
        onChange={(e) => onChange("current_problem", e.target.value)}
        rows={2}
      />
      <Textarea
        placeholder="Way out"
        value={zone.way_out}
        onChange={(e) => onChange("way_out", e.target.value)}
        rows={2}
      />
      <Textarea
        placeholder="What needs to be done"
        value={zone.action_needed}
        onChange={(e) => onChange("action_needed", e.target.value)}
        rows={2}
      />
      <Input
        type="date"
        value={zone.deadline ? zone.deadline.slice(0, 10) : ""}
        onChange={(e) => onChange("deadline", e.target.value || null)}
      />
    </div>
  );
}
