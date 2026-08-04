import type { Member, MemberPosition } from "@/hooks/useMemberStore";

export const POSITIONS: MemberPosition[] = ["Kadep", "Wakadep", "Staff", "Secretary", "Bendahara"];

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

/** RAB (budget) comments: Admins + Bendahara. */
export function canCommentRab(member: Member | null, isAdmin: boolean): boolean {
  return isAdmin || isBendahara(member);
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
