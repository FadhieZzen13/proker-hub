// Who may do what through the assistant. Enforced here on the server, independent
// of anything the model says.
//
//  - BPH (any position): create / update / delete any proker.
//  - Kadep / Wakadep: create / update / delete prokers OWNED by their own division
//    (collab prokers owned by another division are read-only for them).
//  - Everyone else: read-only for prokers.
//  - Monthly tracker: every member, but only their own entries.
//  - Admins (CHAT_ADMIN_MEMBER_IDS): everything above for anyone, no topic filter,
//    no confirmations, deletes happen directly (still logged).

export const DIVISIONS = ["BPH", "AKSI", "POSDM", "ROMAS", "HUMAS", "DANUS", "SEBURA", "MEDIFO"] as const;

export interface Member {
  id: string;
  name: string;
  division: string;
  position: string; // Kadep | Wakadep | Staff | Secretary | Bendahara
  isAdmin?: boolean; // set by the server from CHAT_ADMIN_MEMBER_IDS, never from the client
}

export const isBPH = (m: Member) => m.division === "BPH";
export const isLeader = (m: Member) => m.position === "Kadep" || m.position === "Wakadep";

/** May this member create/update/delete prokers at all? */
export const canWriteProkers = (m: Member) => !!m.isAdmin || isBPH(m) || isLeader(m);

/** May this member create/update/delete a proker owned by `division`? */
export function canManageProker(m: Member, division: string): boolean {
  if (m.isAdmin || isBPH(m)) return true;
  return isLeader(m) && division === m.division;
}

/** Plain-language summary for the system prompt (the server still enforces it). */
export function permissionSummary(m: Member): string {
  return `${prokerSummary(m)} ${dataSummary(m)}`;
}

function dataSummary(m: Member): string {
  if (m.isAdmin) return "Data proker (deskripsi, zona, KPI, log progress, Lapak Kerja, RAB, sesi): semua proker.";
  const rab = isBendahara(m) ? " RAB tidak bisa diubah (Bendahara hanya memberi komentar RAB)." : "";
  const comment = isBendahara(m) ? "" : " Komentar RAB hanya untuk Bendahara/admin.";
  if (isBPH(m)) return `Data proker (deskripsi, zona, KPI, log progress, Lapak Kerja, sesi): semua proker.${rab || ` RAB: proker divisi ${m.division} dan kolaborasinya.`}${comment}`;
  return `Data proker (deskripsi, zona, KPI, log progress, Lapak Kerja, RAB, sesi): proker divisi ${m.division} dan proker kolaborasi dengan ${m.division}.${comment} Semua anggota boleh melihat semua data dan menulis komentar proker berkelanjutan.`;
}

function prokerSummary(m: Member): string {
  if (m.isAdmin) return "Admin: boleh membuat, mengubah, dan menghapus semua proker, serta mengisi tracker anggota mana pun.";
  if (isBPH(m)) return "Anggota BPH: boleh membuat, mengubah, dan menghapus proker semua divisi.";
  if (isLeader(m)) return `${m.position} ${m.division}: boleh membuat, mengubah, dan menghapus proker milik divisi ${m.division} saja.`;
  return "Bukan BPH / Kadep / Wakadep: tidak boleh membuat, menghapus, atau mengubah nama/tanggal/jenis/divisi proker.";
}

// ---------- proker data (zones, Lapak Kerja, RAB, KPIs, logs, comments) ----------
// Mirrors the dashboard (src/lib/roles.ts, ProkerDetail): members of the proker's own or a
// collaborating division may edit its data. BPH and admins may edit every proker's data, as
// with prokers themselves.

type ProkerScope = { division: string; collab_divisions?: string[] | null };

export const isSecretary = (m: Member) => m.position === "Secretary";
export const isBendahara = (m: Member) => m.position === "Bendahara";
const inProkerDivisions = (m: Member, p: ProkerScope) => p.division === m.division || (p.collab_divisions ?? []).includes(m.division);

/** Description, zones, completion, KPIs, progress logs, Log Session entries, Lapak Kerja. */
export const canEditProkerData = (m: Member, p: ProkerScope) => !!m.isAdmin || isBPH(m) || inProkerDivisions(m, p);

/** RAB rows: the running divisions and admins. The Bendahara comments on budgets but never edits them. */
export function canEditRab(m: Member, p: ProkerScope): boolean {
  if (m.isAdmin) return true;
  if (isBendahara(m)) return false;
  return inProkerDivisions(m, p);
}

/** RAB comments: admins + Bendahara. */
export const canCommentRab = (m: Member) => !!m.isAdmin || isBendahara(m);
