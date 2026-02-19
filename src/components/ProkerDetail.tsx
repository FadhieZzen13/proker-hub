import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar, Users, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { type Proker, useDeleteProker, useUpdateProker } from "@/hooks/useProkers";
import { CompletionForm } from "@/components/CompletionForm";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProkerDetailProps {
  proker: Proker | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (proker: Proker) => void;
}

export function ProkerDetail({ proker, open, onOpenChange, onEdit }: ProkerDetailProps) {
  const [showCompletion, setShowCompletion] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const deleteMutation = useDeleteProker();
  const updateMutation = useUpdateProker();

  if (!proker) return null;

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this proker?")) {
      await deleteMutation.mutateAsync(proker.id);
      toast.success("Proker deleted");
      onOpenChange(false);
    }
  };

  const handleSaveNotes = async () => {
    await updateMutation.mutateAsync({ id: proker.id, notes: notesValue });
    toast.success("Notes updated");
    setEditingNotes(false);
  };

  const startEditNotes = () => {
    setNotesValue(proker.notes || "");
    setEditingNotes(true);
  };

  return (
    <>
      <Dialog open={open && !showCompletion} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl text-foreground">{proker.nama_proker}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">{proker.division} Division</p>
              </div>
              <div className="flex gap-2">
                {proker.status === "active" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(proker); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleDelete}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoItem icon={<Calendar className="h-4 w-4" />} label="Date" value={format(new Date(proker.tanggal), "dd MMM yyyy")} />
              <InfoItem icon={<Users className="h-4 w-4" />} label="Target" value={`${proker.target_peserta} peserta`} />
              <InfoItem label="Type" value={<Badge variant={proker.type === "Internal" ? "default" : "secondary"} className={proker.type === "Internal" ? "bg-primary text-primary-foreground" : ""}>{proker.type}</Badge>} />
              <InfoItem label="Status" value={
                <Badge className={proker.status === "complete" ? "bg-green-500/10 text-green-600 border-green-200" : "bg-primary/10 text-primary border-primary/20"}>
                  {proker.status === "complete" ? "Complete" : "Active"}
                </Badge>
              } />
            </div>

            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Progress</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${proker.progress}%` }} />
                </div>
                <span className="text-sm font-bold text-foreground">{proker.progress}%</span>
              </div>
            </div>

            {proker.description && (
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description</Label>
                <p className="text-sm text-foreground mt-1">{proker.description}</p>
              </div>
            )}

            {proker.status === "active" && (
              <Button className="w-full bg-green-600 hover:bg-green-700 text-primary-foreground" onClick={() => setShowCompletion(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Complete
              </Button>
            )}

            {proker.status === "complete" && (
              <>
                <Separator />
                <h3 className="font-semibold text-foreground">Completion Report</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Predicted Peserta" value={`${proker.target_peserta}`} />
                  <InfoItem label="Actual Peserta" value={`${proker.actual_peserta ?? "-"}`} />
                </div>
                {proker.success_factors && (
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Success Factors</Label>
                    <p className="text-sm text-foreground mt-1">{proker.success_factors}</p>
                  </div>
                )}
                {proker.improvements && (
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Improvements</Label>
                    <p className="text-sm text-foreground mt-1">{proker.improvements}</p>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Notes</Label>
                    <Button size="sm" variant="ghost" onClick={startEditNotes} className="text-xs h-6">
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  </div>
                  {editingNotes ? (
                    <div className="mt-1 space-y-2">
                      <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} rows={3} />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground mt-1">{proker.notes || "No notes yet."}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CompletionForm
        proker={proker}
        open={showCompletion}
        onOpenChange={setShowCompletion}
        onComplete={() => { setShowCompletion(false); onOpenChange(false); }}
      />
    </>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
