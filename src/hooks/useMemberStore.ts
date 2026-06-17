import { useCallback, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MemberPosition = "Kadep" | "Wakadep" | "Staff" | "Secretary";

export interface Member {
  id: string;
  name: string;
  faculty: string;
  intake: number;
  phone: string;
  division: string;
  position: MemberPosition;
  registeredAt: string;
}

const CURRENT_MEMBER_KEY = "ppi_current_member_id";
const ADMIN_SESSION_KEY = "ppi_admin_session";

// Admin credentials
const ADMIN_NAME = "PPI UPM";
const ADMIN_PASSWORD = "AdminPrabhadhara25/26";

export { ADMIN_NAME };

// ---- Session helpers (localStorage, per-browser) ----
function loadCurrentId(): string | null {
  return localStorage.getItem(CURRENT_MEMBER_KEY);
}
function saveCurrentId(id: string | null) {
  if (id) localStorage.setItem(CURRENT_MEMBER_KEY, id);
  else localStorage.removeItem(CURRENT_MEMBER_KEY);
  window.dispatchEvent(new Event("ppi-session-updated"));
}
function loadIsAdmin(): boolean {
  return localStorage.getItem(ADMIN_SESSION_KEY) === "1";
}
function saveIsAdmin(value: boolean) {
  if (value) localStorage.setItem(ADMIN_SESSION_KEY, "1");
  else localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new Event("ppi-session-updated"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMember(row: any): Member {
  return {
    id: row.id,
    name: row.name,
    faculty: row.faculty,
    intake: row.intake,
    phone: row.phone,
    division: row.division,
    position: (row.position as MemberPosition) ?? "Staff",
    registeredAt: row.registered_at,
  };
}

export function useMemberStore() {
  const qc = useQueryClient();

  // Track session state reactively via the custom event
  const [sessionVersion, setSessionVersion] = useState(0);
  useEffect(() => {
    const handler = () => setSessionVersion((v) => v + 1);
    window.addEventListener("ppi-session-updated", handler);
    return () => window.removeEventListener("ppi-session-updated", handler);
  }, []);

  // Fetch all members from Supabase
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("registered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToMember);
    },
    refetchInterval: 30_000, // refresh every 30s for cross-tab sync
  });

  // Session state from localStorage (per-browser), re-read when sessionVersion changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _v = sessionVersion; // ensure re-render when session changes
  const currentMemberId = loadCurrentId();
  const isAdmin = loadIsAdmin();
  const currentMember = members.find((m) => m.id === currentMemberId) ?? null;

  const register = useCallback(
    async (data: Omit<Member, "id" | "registeredAt">): Promise<Member> => {
      const { data: row, error } = await supabase
        .from("members")
        .insert({
          name: data.name,
          faculty: data.faculty,
          intake: data.intake,
          phone: data.phone,
          division: data.division,
        })
        .select()
        .single();
      if (error) throw error;
      const newMember = rowToMember(row);
      saveCurrentId(newMember.id);
      qc.invalidateQueries({ queryKey: ["members"] });
      return newMember;
    },
    [qc]
  );

  const login = useCallback((member: Member) => {
    saveCurrentId(member.id);
    qc.invalidateQueries({ queryKey: ["members"] });
  }, [qc]);

  const loginAdmin = useCallback((password: string): boolean => {
    if (password !== ADMIN_PASSWORD) return false;
    saveIsAdmin(true);
    qc.invalidateQueries({ queryKey: ["members"] });
    return true;
  }, [qc]);

  const logout = useCallback(() => {
    saveCurrentId(null);
    saveIsAdmin(false);
    qc.invalidateQueries({ queryKey: ["members"] });
  }, [qc]);

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
      if (loadCurrentId() === id) saveCurrentId(null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Member, "id" | "registeredAt">> }) => {
      const { error } = await supabase
        .from("members")
        .update({
          name: data.name,
          faculty: data.faculty,
          intake: data.intake,
          phone: data.phone,
          division: data.division,
          position: data.position,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });

  const clearAllMembers = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      saveCurrentId(null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });

  return {
    members,
    currentMember,
    isAdmin,
    register,
    login,
    loginAdmin,
    logout,
    deleteMember: (id: string) => deleteMember.mutateAsync(id),
    updateMember: (id: string, data: Partial<Omit<Member, "id" | "registeredAt">>) =>
      updateMember.mutateAsync({ id, data }),
    clearAllMembers: () => clearAllMembers.mutateAsync(),
  };
}
