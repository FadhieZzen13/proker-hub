import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/integrations/supabase/db";
import { useMemberStore } from "@/hooks/useMemberStore";
import {
  useDashboardNotifications,
  type DashboardNotification,
} from "@/hooks/useDashboardNotifications";

export type MyNotificationKind = "task" | "birthday" | "activity";

export interface MyNotification {
  id: string;
  kind: MyNotificationKind;
  title: string;
  body: string;
  /** For task notifications — lets the UI deep-link to the proker's Lapak Kerja. */
  prokerId?: string;
  /** For activity notifications — the division dashboard to deep-link to. */
  division?: string;
  createdAt: string;
  /** Whether the user has dismissed/read this entry. */
  read: boolean;
}

const READ_KEY = "ppi_my_notifications_read";

function readReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  window.dispatchEvent(new Event("ppi-my-notifications-read"));
}

export function useMyNotifications() {
  const { currentMember, members, isAdmin } = useMemberStore();
  const activity = useDashboardNotifications();

  const [birthdayNotifications, setBirthdayNotifications] = useState<MyNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => readReadIds());

  // ── My assigned tasks ─────────────────────────────────────────────────────
  // Sourced from `task_assignments` (canonical, and carries assigned_at) rather
  // than the denormalized lapak_tasks.members JSONB column. Polls so an assignee
  // sees a new assignment without reloading the app.
  const { data: taskNotifications = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["my_task_assignments", currentMember?.id],
    enabled: !!currentMember,
    refetchInterval: 30_000,
    queryFn: async (): Promise<MyNotification[]> => {
      const { data: rows, error } = await sb
        .from("task_assignments")
        .select("task_id, proker_id, assigned_at")
        .eq("member_id", currentMember!.id)
        .order("assigned_at", { ascending: false });
      if (error) throw error;

      const assignments = (rows ?? []) as { task_id: string; proker_id: string; assigned_at: string }[];
      if (assignments.length === 0) return [];

      const { data: taskRows, error: taskErr } = await sb
        .from("lapak_tasks")
        .select("id, tugas, deadline, done")
        .in("id", assignments.map((a) => a.task_id));
      if (taskErr) throw taskErr;

      const byId = new Map(
        ((taskRows ?? []) as { id: string; tugas: string | null; deadline: string | null; done: boolean }[])
          .map((t) => [t.id, t])
      );

      return assignments.flatMap((a) => {
        const task = byId.get(a.task_id);
        // Skip rows whose task vanished, and tasks already finished.
        if (!task || task.done) return [];
        return [{
          // assigned_at is part of the id so re-assigning a dismissed task notifies again.
          id: `task-${a.task_id}-${a.assigned_at}`,
          kind: "task" as const,
          title: "Task assigned to you",
          body: `${task.tugas || "(untitled task)"}${task.deadline ? ` · due ${new Date(task.deadline).toLocaleDateString()}` : ""}`,
          prokerId: a.proker_id,
          createdAt: a.assigned_at,
          read: false,
        }];
      });
    },
  });

  // ── Today's birthdays ────────────────────────────────────────────────────
  useEffect(() => {
    if (members.length === 0) {
      setBirthdayNotifications([]);
      return;
    }
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todays = members.filter((m) => {
      if (!m.birthDate) return false;
      const parts = m.birthDate.split("-");
      const m2 = parts[1];
      const d2 = parts[2];
      return m2 === mm && d2 === dd;
    });
    const items: MyNotification[] = todays.map((m) => ({
      id: `birthday-${m.id}-${today.getFullYear()}`,
      kind: "birthday",
      title: "🎂 Birthday today",
      body: `${m.name} (${m.division})`,
      createdAt: new Date().toISOString(),
      read: false,
    }));
    setBirthdayNotifications(items);
  }, [members]);

  // ── Read-state sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setReadIds(readReadIds());
    window.addEventListener("ppi-my-notifications-read", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("ppi-my-notifications-read", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const activityNotifications: MyNotification[] = useMemo(
    () =>
      activity.map((a: DashboardNotification) => ({
        id: `activity-${a.id}`,
        kind: "activity",
        title: a.prokerName,
        body: a.message,
        prokerId: a.prokerId,
        division: a.division,
        createdAt: a.createdAt,
        read: false,
      })),
    [activity]
  );

  const all = useMemo(() => {
    const merged = [...taskNotifications, ...birthdayNotifications, ...activityNotifications];
    return merged
      .map((n) => ({ ...n, read: n.read || readIds.has(n.id) }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [taskNotifications, birthdayNotifications, activityNotifications, readIds]);

  const unreadCount = all.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeReadIds(next);
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      all.forEach((n) => next.add(n.id));
      writeReadIds(next);
      return next;
    });
  };

  return { notifications: all, unreadCount, loadingTasks, markRead, markAllRead, isAdmin };
}
