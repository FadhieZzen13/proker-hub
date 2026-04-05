import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MeetingStatus = "scheduled" | "complete";

export type Meeting = {
  id: string;
  division: string;
  topic: string;
  scheduled_at: string;
  planned_participants: number;
  status: MeetingStatus;
  actual_participants: number | null;
  meeting_notes: string | null;
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingInsert = Omit<
  Meeting,
  "id" | "created_at" | "updated_at" | "actual_participants" | "meeting_notes" | "status"
> & {
  actual_participants?: number | null;
  meeting_notes?: string | null;
  status?: MeetingStatus;
  created_by_member_id?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMeeting(row: any): Meeting {
  return {
    ...row,
    status: row.status === "complete" ? "complete" : "scheduled",
    actual_participants: row.actual_participants ?? null,
    meeting_notes: row.meeting_notes ?? null,
    created_by_member_id: row.created_by_member_id ?? null,
  } as Meeting;
}

export function useMeetings(division?: string) {
  return useQuery({
    queryKey: ["meetings", division],
    queryFn: async () => {
      let query = supabase.from("meetings").select("*").order("scheduled_at", { ascending: true });
      if (division) query = query.eq("division", division);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(normalizeMeeting);
    },
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meeting: MeetingInsert) => {
      const { data, error } = await supabase.from("meetings").insert(meeting).select().single();
      if (error) throw error;
      return normalizeMeeting(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Meeting> & { id: string }) => {
      const { data, error } = await supabase.from("meetings").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return normalizeMeeting(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
