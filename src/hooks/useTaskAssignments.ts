import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";

export interface AssignedMember {
  id: string;
  name: string;
}

/**
 * Assign members to a task. Keeps both the denormalized `members` JSONB column
 * on lapak_tasks (for fast display) and the `task_assignments` table (canonical,
 * queryable) in sync.
 */
export function useAssignTaskMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId, prokerId, members,
    }: { taskId: string; prokerId: string; members: AssignedMember[] }) => {
      const ids = members.map((m) => m.id);

      const { error: updErr } = await sb
        .from("lapak_tasks")
        .update({ members })
        .eq("id", taskId);
      if (updErr) throw updErr;

      const { error: delErr } = await sb
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId);
      if (delErr) throw delErr;

      if (ids.length > 0) {
        const rows = members.map((m) => ({ task_id: taskId, proker_id: prokerId, member_id: m.id }));
        const { error: insErr } = await sb.from("task_assignments").insert(rows);
        if (insErr) throw insErr;
      }

      return { taskId, prokerId };
    },
    onSuccess: ({ prokerId }) => {
      qc.invalidateQueries({ queryKey: ["lapak_tasks", prokerId] });
      qc.invalidateQueries({ queryKey: ["task_assignments", prokerId] });
    },
  });
}

/** All assignment rows for a proker (used by the notifications layer). */
export async function fetchTaskAssignments(prokerId: string) {
  const { data, error } = await sb
    .from("task_assignments")
    .select("task_id, member_id, proker_id")
    .eq("proker_id", prokerId);
  if (error) throw error;
  return (data ?? []) as { task_id: string; member_id: string; proker_id: string }[];
}
