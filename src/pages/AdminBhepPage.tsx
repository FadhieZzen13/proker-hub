import { useState } from "react";
import { format } from "date-fns";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMemberStore } from "@/hooks/useMemberStore";
import {
  useAddBhepSubmission,
  useBhepSubmissions,
  useDeleteBhepSubmission,
  useUpdateBhepSubmission,
} from "@/hooks/useBhepSubmissions";
import { toast } from "sonner";

export default function AdminBhepPage() {
  const { isAdmin } = useMemberStore();
  const { data: submissions = [], isLoading } = useBhepSubmissions();
  const addSubmission = useAddBhepSubmission();
  const updateSubmission = useUpdateBhepSubmission();
  const deleteSubmission = useDeleteBhepSubmission();

  const [form, setForm] = useState({
    submission_date: new Date().toISOString().slice(0, 10),
    link: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-dashed border-border/60">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-sm font-medium">Admin only</p>
            <p className="text-xs mt-1">You do not have access to manage BHEP submissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resetForm = () => {
    setForm({
      submission_date: new Date().toISOString().slice(0, 10),
      link: "",
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.submission_date) {
      toast.error("Submission date is required");
      return;
    }
    if (!form.link.trim()) {
      toast.error("Submission link is required");
      return;
    }
    try {
      if (editingId) {
        await updateSubmission.mutateAsync({
          id: editingId,
          submission_date: form.submission_date,
          link: form.link.trim(),
        });
        toast.success("Submission updated");
      } else {
        await addSubmission.mutateAsync({
          submission_date: form.submission_date,
          link: form.link.trim(),
        });
        toast.success("Submission added");
      }
      resetForm();
    } catch {
      toast.error(editingId ? "Failed to update submission" : "Failed to add submission");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">BHEP Submissions</h1>
          <Badge variant="outline" className="text-[10px]">Admin</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Manage submission dates and links for proposal kertas kerja BHEP.</p>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editingId ? "Edit Submission" : "Add Submission"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Submission Date</Label>
              <Input
                type="date"
                value={form.submission_date}
                onChange={(e) => setForm((prev) => ({ ...prev, submission_date: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Submission Link</Label>
              <Input
                placeholder="https://..."
                value={form.link}
                onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            {editingId && (
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={addSubmission.isPending || updateSubmission.isPending}
            >
              {editingId ? "Save Changes" : "Add Submission"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Submission List</h2>
            <span className="text-xs text-muted-foreground">{submissions.length} items</span>
          </div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : submissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No submission dates yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {submissions.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Submission Proposal BHEP</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{format(new Date(item.submission_date), "dd MMM yyyy")}</span>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {item.link}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          submission_date: item.submission_date,
                          link: item.link,
                        });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteSubmission.mutateAsync({ id: item.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
