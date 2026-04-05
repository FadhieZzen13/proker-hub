import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMeeting, useUpdateMeeting, type Meeting } from "@/hooks/useMeetings";
import { useMemberStore } from "@/hooks/useMemberStore";
import { toast } from "sonner";

interface MeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division: string;
  editMeeting?: Meeting | null;
}

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function toTimeInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function MeetingModal({ open, onOpenChange, division, editMeeting }: MeetingModalProps) {
  const [form, setForm] = useState({
    topic: "",
    date: new Date().toISOString().slice(0, 10),
    time: "20:00",
    planned_participants: 0,
    actual_participants: 0,
    meeting_notes: "",
  });

  const createMutation = useCreateMeeting();
  const updateMutation = useUpdateMeeting();
  const { currentMember } = useMemberStore();

  useEffect(() => {
    if (editMeeting) {
      setForm({
        topic: editMeeting.topic,
        date: toDateInputValue(editMeeting.scheduled_at),
        time: toTimeInputValue(editMeeting.scheduled_at),
        planned_participants: editMeeting.planned_participants,
        actual_participants: editMeeting.actual_participants ?? 0,
        meeting_notes: editMeeting.meeting_notes ?? "",
      });
      return;
    }

    setForm({
      topic: "",
      date: new Date().toISOString().slice(0, 10),
      time: "20:00",
      planned_participants: 0,
      actual_participants: 0,
      meeting_notes: "",
    });
  }, [editMeeting, open]);

  const notesWordCount = countWords(form.meeting_notes);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim()) {
      toast.error("Topic is required");
      return;
    }
    if (notesWordCount > 5000) {
      toast.error("Meeting notes cannot exceed 5000 words");
      return;
    }

    const scheduledAt = combineDateTime(form.date, form.time);

    try {
      if (editMeeting) {
        if (editMeeting.status === "complete") {
          await updateMutation.mutateAsync({
            id: editMeeting.id,
            topic: form.topic,
            scheduled_at: scheduledAt,
            actual_participants: form.actual_participants,
            meeting_notes: form.meeting_notes,
          });
        } else {
          await updateMutation.mutateAsync({
            id: editMeeting.id,
            topic: form.topic,
            scheduled_at: scheduledAt,
            planned_participants: form.planned_participants,
          });
        }
        toast.success("Meeting updated");
      } else {
        await createMutation.mutateAsync({
          division,
          topic: form.topic,
          scheduled_at: scheduledAt,
          planned_participants: form.planned_participants,
          created_by_member_id: currentMember?.id ?? null,
        });
        toast.success("Meeting created");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save meeting");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editMeeting ? "Edit Meeting" : "Add Meeting"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Topic of Discussion</Label>
            <Input
              value={form.topic}
              onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
              placeholder="Weekly division meeting"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>{editMeeting?.status === "complete" ? "Actual Joined People" : "Expected Joined People"}</Label>
            <Input
              type="number"
              min={0}
              value={editMeeting?.status === "complete" ? form.actual_participants : form.planned_participants}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 0;
                setForm((prev) => (
                  editMeeting?.status === "complete"
                    ? { ...prev, actual_participants: val }
                    : { ...prev, planned_participants: val }
                ));
              }}
            />
          </div>

          {editMeeting?.status === "complete" && (
            <div>
              <div className="flex items-center justify-between">
                <Label>Meeting Notes</Label>
                <span className={`text-xs ${notesWordCount > 5000 ? "text-destructive" : "text-muted-foreground"}`}>
                  {notesWordCount}/5000 words
                </span>
              </div>
              <Textarea
                className="min-h-[180px] mt-2"
                value={form.meeting_notes}
                onChange={(e) => setForm((prev) => ({ ...prev, meeting_notes: e.target.value }))}
                placeholder="Update meeting notes..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || notesWordCount > 5000}>
              {editMeeting ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
