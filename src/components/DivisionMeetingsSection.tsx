import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Pencil, Plus, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDeleteMeeting, useMeetings, type Meeting } from "@/hooks/useMeetings";
import { MeetingModal } from "@/components/MeetingModal";
import { MeetingCompletionDialog } from "@/components/MeetingCompletionDialog";
import { toast } from "sonner";

interface DivisionMeetingsSectionProps {
  division: string;
}

export function DivisionMeetingsSection({ division }: DivisionMeetingsSectionProps) {
  const { data: meetings = [], isLoading } = useMeetings(division);
  const deleteMutation = useDeleteMeeting();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [completeMeeting, setCompleteMeeting] = useState<Meeting | null>(null);

  const filtered = useMemo(() => {
    return meetings.filter((m) => m.topic.toLowerCase().includes(search.toLowerCase()));
  }, [meetings, search]);

  const scheduled = filtered.filter((m) => m.status === "scheduled");
  const completed = filtered.filter((m) => m.status === "complete");

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Meeting deleted");
    } catch {
      toast.error("Failed to delete meeting");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Division {division} Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {scheduled.length} scheduled · {completed.length} completed
          </p>
        </div>
        <Button onClick={() => { setEditMeeting(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Meeting
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search meeting topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading meetings...</div>
      ) : (
        <>
          <section className="mb-8 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Scheduled</h2>
              <Badge variant="outline" className="gap-1 text-xs border-blue-300 text-blue-600">
                <Clock3 className="h-3 w-3" /> {scheduled.length}
              </Badge>
            </div>

            {scheduled.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">
                No scheduled meetings
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduled.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onEdit={() => { setEditMeeting(meeting); setModalOpen(true); }}
                    onDelete={() => handleDelete(meeting.id)}
                    onComplete={() => setCompleteMeeting(meeting)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Completed</h2>
              <Badge variant="outline" className="gap-1 text-xs border-green-300 text-green-700">
                <CheckCircle2 className="h-3 w-3" /> {completed.length}
              </Badge>
            </div>

            {completed.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">
                No completed meetings
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onEdit={() => { setEditMeeting(meeting); setModalOpen(true); }}
                    onDelete={() => handleDelete(meeting.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <MeetingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        division={division}
        editMeeting={editMeeting}
      />

      <MeetingCompletionDialog
        meeting={completeMeeting}
        open={!!completeMeeting}
        onOpenChange={(open) => {
          if (!open) setCompleteMeeting(null);
        }}
      />
    </div>
  );
}

function MeetingCard({
  meeting,
  onEdit,
  onDelete,
  onComplete,
}: {
  meeting: Meeting;
  onEdit: () => void;
  onDelete: () => void;
  onComplete?: () => void;
}) {
  return (
    <Card className="border-border/70 shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{meeting.topic}</p>
            <p className="text-xs text-muted-foreground">{meeting.division}</p>
          </div>
          <Badge className={meeting.status === "complete" ? "bg-green-500/10 text-green-700 border-green-200" : "bg-blue-500/10 text-blue-700 border-blue-200"}>
            {meeting.status === "complete" ? "Complete" : "Scheduled"}
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(meeting.scheduled_at), "dd MMM yyyy, HH:mm")}
          </p>
          <p className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {meeting.status === "complete"
              ? `${meeting.actual_participants ?? 0} joined`
              : `${meeting.planned_participants} expected joined`}
          </p>
        </div>

        {meeting.status === "complete" && meeting.meeting_notes && (
          <p className="text-xs text-foreground line-clamp-4 whitespace-pre-wrap">{meeting.meeting_notes}</p>
        )}

        <div className="flex items-center justify-end gap-1.5 pt-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {meeting.status === "scheduled" && onComplete && (
            <Button size="sm" className="h-8" onClick={onComplete}>
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
