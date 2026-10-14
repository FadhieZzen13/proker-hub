// Who may edit which divisions' prokers on the public website (Public Website → Prokers).
// Same list as the dashboard's src/lib/siteAccess.ts (a test keeps them identical); this copy
// is the one that is enforced.
//
//  - Listed members: exactly the divisions given ("all" = every division).
//  - Other BPH members: no access.
//  - Kadep / Wakadep: their own division.
//  - Everyone else: no access.
// Site-wide content (Members, Content tabs) stays behind the website-admin password.

export const SITE_DIVISIONS = ["BPH", "AKSI", "POSDM", "ROMAS", "HUMAS", "DANUS", "SEBURA", "MEDIFO"];

export const SITE_EDITORS: Record<string, "all" | string[]> = {
  "0974c7ac-a1b6-4a01-9016-6b56fc573d05": "all", // Fadhie Zen
  "bbddad25-bc01-4f95-bd9e-9eae7d796cc1": "all", // Mikail
  "10009df6-1f6a-4b79-bf7d-8b3fe7fedb62": ["SEBURA", "MEDIFO"], // Sidqin Sukma Maarij (Keen)
  "66ef0541-79bd-42ff-9b3c-752856a9b7aa": ["HUMAS", "ROMAS"], // Harist Mahri
  "80c30996-e859-4dfb-bab6-dcccce1e1f77": ["DANUS"], // Indira Zulfa Novianti Sonhadji
};

export function siteEditableDivisions(m: { id: string; division: string; position: string } | null | undefined): string[] {
  if (!m) return [];
  const listed = SITE_EDITORS[m.id];
  if (listed === "all") return [...SITE_DIVISIONS];
  if (listed) return [...listed];
  if (m.division === "BPH") return []; // e.g. Kayla: no access
  if (m.position === "Kadep" || m.position === "Wakadep") return [m.division];
  return [];
}
