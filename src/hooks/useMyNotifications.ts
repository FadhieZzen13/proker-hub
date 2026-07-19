import { useEffect, useMemo, useState } from "react";
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
  /** For task notifications — lets the UI deep-link to the proker. */
  prokerId?: string;
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

  const [taskNotifications, setTaskNotifications] = useState<MyNotification[]>([]);
  const [birthdayNotifications, setBirthdayNotifications] = useState<MyNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => readReadIds());
  const [loadingTasks, setLoadingTasks] = useState(false);

  // ── My assigned tasks ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentMember) {
      setTaskNotifications([]);
      return;
    }
    let cancelled = false;
    setLoadingTasks(true);
    (async () => {
      // Tasks where members[] contains the current member id.
      const { data, error } = await sb
        .from("lapak_tasks")
        .select("id, proker_id, tugas, deadline, done, members")
        .contains("members", [{ id: currentMember.id }]);
      if (cancelled) return;
      if (error) {
        console.error("Failed to load assigned tasks:", error);
        setTaskNotifications([]);
      } else {
        const items: MyNotification[] = ((data ?? []) as Array<{
          id: string;
          proker_id: string;
          tugas: string | null;
          deadline: string | null;
          done: boolean;
          members: Array<{ id: string; name: string }>;
        }>).map((t) => ({
          id: `task-${t.id}`,
          kind: "task",
          title: "Task assigned to you",
          body: `${t.tugas || "(untitled task)"}${t.deadline ? ` · due ${new Date(t.deadline).toLocaleDateString()}` : ""}${t.done ? " (done)" : ""}`,
          prokerId: t.proker_id,
          createdAt: t.deadline ?? new Date().toISOString(),
        }));
        setTaskNotifications(items);
      }
      setLoadingTasks(false);
    })();
    return () => { cancelled = true; };
  }, [currentMember?.id]);

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
