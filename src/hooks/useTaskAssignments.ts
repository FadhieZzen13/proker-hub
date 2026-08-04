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

      // Diff rather than delete-all-then-reinsert, so `assigned_at` survives for
      // members who stay on the task (their notification must not resurface).
      const { data: existingRows, error: selErr } = await sb
        .from("task_assignments")
        .select("member_id")
        .eq("task_id", taskId);
      if (selErr) throw selErr;

      const existingIds = new Set(((existingRows ?? []) as { member_id: string }[]).map((r) => r.member_id));
      const removed = [...existingIds].filter((id) => !ids.includes(id));
      const added = ids.filter((id) => !existingIds.has(id));

      if (removed.length > 0) {
        const { error: delErr } = await sb
          .from("task_assignments")
          .delete()
          .eq("task_id", taskId)
          .in("member_id", removed);
        if (delErr) throw delErr;
      }

      if (added.length > 0) {
        const rows = added.map((id) => ({ task_id: taskId, proker_id: prokerId, member_id: id }));
        const { error: insErr } = await sb.from("task_assignments").insert(rows);
        if (insErr) throw insErr;
      }

      return { taskId, prokerId };
    },
    onSuccess: ({ prokerId }) => {
      qc.invalidateQueries({ queryKey: ["lapak_tasks", prokerId] });
      qc.invalidateQueries({ queryKey: ["task_assignments", prokerId] });
      // Refresh the bell immediately when someone assigns a task to themselves;
      // other members pick it up on the next poll.
      qc.invalidateQueries({ queryKey: ["my_task_assignments"] });
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
