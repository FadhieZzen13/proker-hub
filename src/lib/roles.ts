import type { Member, MemberPosition } from "@/hooks/useMemberStore";

export const POSITIONS: MemberPosition[] = ["Kadep", "Wakadep", "Staff"];

/** A division head or deputy. */
export function isLeader(member: Member | null): boolean {
  return !!member && (member.position === "Kadep" || member.position === "Wakadep");
}

/** Member of the executive board (BPH division). */
export function isBPH(member: Member | null): boolean {
  return !!member && member.division === "BPH";
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
