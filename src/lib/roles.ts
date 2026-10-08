import type { Member, MemberPosition } from "@/hooks/useMemberStore";

export const POSITIONS: MemberPosition[] = ["Kadep", "Wakadep", "Staff", "Secretary", "Bendahara"];

/**
 * Member accounts with admin privileges in the dashboard (same as the separate
 * "PPI UPM" admin login). Keep in sync with CHAT_ADMIN_MEMBER_IDS in the assistant.
 * NOTE: like the rest of the dashboard's roles this is enforced in the browser only;
 * server-side checks (website-admin password, assistant) remain the real gate.
 */
export const ADMIN_MEMBER_IDS = [
  "0974c7ac-a1b6-4a01-9016-6b56fc573d05", // Fadhie Zen (BPH)
];

export function isAdminMember(member: { id: string } | null | undefined): boolean {
  return !!member && ADMIN_MEMBER_IDS.includes(member.id);
}

/** A division head or deputy. */
export function isLeader(member: Member | null): boolean {
  return !!member && (member.position === "Kadep" || member.position === "Wakadep");
}

/** Member of the executive board (BPH division). */
export function isBPH(member: Member | null): boolean {
  return !!member && member.division === "BPH";
}

/** The organisation secretary — curates the shared Links page. */
export function isSecretary(member: Member | null): boolean {
  return !!member && member.position === "Secretary";
}

/** The organisation treasurer — owns RAB (budget) comments. */
export function isBendahara(member: Member | null): boolean {
  return !!member && member.position === "Bendahara";
}

/** Who may comment on a RAB (budget): Admins + the Bendahara. */
export function canCommentRab(member: Member | null, isAdmin: boolean): boolean {
  return isAdmin || isBendahara(member);
}

/**
 * Who may edit RAB rows: the divisions running the proker, plus Admin.
 *
 * Deliberately narrower than canEditLapak — the Bendahara oversees budgets by
 * commenting on them, never by editing, so they are excluded outright rather
 * than merely losing the cross-division bypass (they sit in BPH, and would
 * otherwise still edit every BPH-owned proker's RAB). The Secretary likewise
 * gets no bypass here.
 */
export function canEditRab(
  member: Member | null,
  isAdmin: boolean,
  proker: { division: string; collab_divisions?: string[] | null } | null
): boolean {
  if (isAdmin) return true;
  if (!member || !proker) return false;
  if (isBendahara(member)) return false;
  return proker.division === member.division || (proker.collab_divisions ?? []).includes(member.division);
}

/** Lapak Kerja comments: Admins + Secretary + Bendahara. */
export function canCommentLapak(member: Member | null, isAdmin: boolean): boolean {
  return isAdmin || isSecretary(member) || isBendahara(member);
}

/**
 * Lapak Kerja editing: the proker's own division and its collaborators, plus
 * Admin/Secretary/Bendahara who work across every proker. Mirrors the
 * owner-or-collaborator rule used by ProkerDetail and DivisionView.
 */
export function canEditLapak(
  member: Member | null,
  isAdmin: boolean,
  proker: { division: string; collab_divisions?: string[] | null } | null
): boolean {
  if (isAdmin || isSecretary(member) || isBendahara(member)) return true;
  if (!member || !proker) return false;
  return proker.division === member.division || (proker.collab_divisions ?? []).includes(member.division);
}

/** Who may add/edit/delete shared links: Secretary + Admin. */
export function canEditLinks(member: Member | null, isAdmin: boolean): boolean {
  return isAdmin || isSecretary(member);
}

/** Who may see links the Secretary marked as restricted: Secretary + BPH + Admin. */
export function canSeeRestrictedLinks(member: Member | null, isAdmin: boolean): boolean {
  return isAdmin || isSecretary(member) || isBPH(member);
}

/** POSDM head/deputy — co-owns the evaluation outcome with BPH. */
export function isPosdmLeader(member: Member | null): boolean {
  return !!member && member.division === "POSDM" && isLeader(member);
}

/**
 * Who may submit evaluations:
 *  - Best Member: a Kadep/Wakadep scores Staff in their own division.
 *  - Best Kadep/Wakadep: a BPH member scores leaders.
 * Admin may always submit (on behalf of anyone).
 */
export function canSubmitBestMember(member: Member | null, isAdmin: boolean): boolean {
  return isAdmin || isLeader(member);
}

export function canSubmitBestLeader(member: Member | null, isAdmin: boolean): boolean {
  return isAdmin || isBPH(member);
}

/**
 * Who may see aggregated evaluation results: only POSDM Kadep/Wakadep + BPH.
 * (UI-enforced — see security note; not cryptographically private.)
 */
export function canViewEvalResults(member: Member | null, isAdmin: boolean): boolean {
  return isAdmin || isBPH(member) || isPosdmLeader(member);
}
