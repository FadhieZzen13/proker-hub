// Who may do what through the assistant. Enforced here on the server, independent
// of anything the model says.
//
//  - BPH (any position): create / update / delete any proker.
//  - Kadep / Wakadep: create / update / delete prokers OWNED by their own division
//    (collab prokers owned by another division are read-only for them).
//  - Everyone else: read-only for prokers.
//  - Monthly tracker: every member, but only their own entries.

export const DIVISIONS = ["BPH", "AKSI", "POSDM", "ROMAS", "HUMAS", "DANUS", "SEBURA", "MEDIFO"] as const;

export interface Member {
  id: string;
  name: string;
  division: string;
  position: string; // Kadep | Wakadep | Staff | Secretary | Bendahara
}

export const isBPH = (m: Member) => m.division === "BPH";
export const isLeader = (m: Member) => m.position === "Kadep" || m.position === "Wakadep";

/** May this member create/update/delete prokers at all? */
export const canWriteProkers = (m: Member) => isBPH(m) || isLeader(m);

/** May this member create/update/delete a proker owned by `division`? */
export function canManageProker(m: Member, division: string): boolean {
  if (isBPH(m)) return true;
  return isLeader(m) && division === m.division;
}

/** Plain-language summary for the system prompt (the server still enforces it). */
export function permissionSummary(m: Member): string {
  if (isBPH(m)) return "Anggota BPH: boleh membuat, mengubah, dan menghapus proker semua divisi.";
  if (isLeader(m)) return `${m.position} ${m.division}: boleh membuat, mengubah, dan menghapus proker milik divisi ${m.division} saja.`;
  return "Bukan BPH / Kadep / Wakadep: hanya boleh melihat proker, tidak boleh mengubahnya.";
}
