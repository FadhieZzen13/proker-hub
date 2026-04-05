import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateMeeting, type Meeting } from "@/hooks/useMeetings";
import { toast } from "sonner";

interface MeetingCompletionDialogProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function MeetingCompletionDialog({ meeting, open, onOpenChange }: MeetingCompletionDialogProps) {
  const [actualParticipants, setActualParticipants] = useState<number>(meeting?.planned_participants ?? 0);
  const [notes, setNotes] = useState("");
  const updateMutation = useUpdateMeeting();

  const wordCount = useMemo(() => countWords(notes), [notes]);

  if (!meeting) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wordCount > 5000) {
      toast.error("Meeting notes cannot exceed 5000 words");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: meeting.id,
        status: "complete",
        actual_participants: actualParticipants,
        meeting_notes: notes,
      });
      toast.success("Meeting marked as complete");
      onOpenChange(false);
    } catch {
      toast.error("Failed to complete meeting");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Complete Meeting - {meeting.topic}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>How many people joined</Label>
            <Input
              type="number"
              min={0}
              value={actualParticipants}
              onChange={(e) => setActualParticipants(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Meeting Notes</Label>
              <span className={`text-xs ${wordCount > 5000 ? "text-destructive" : "text-muted-foreground"}`}>
                {wordCount}/5000 words
              </span>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              placeholder="Write complete meeting notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending || wordCount > 5000}>Save as Complete</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
