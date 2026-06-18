export const DIVISION_COLORS: Record<string, string> = {
  BPH:    "#ba1a14", // primary red — executive council
  AKSI:   "#2563eb", // blue — action & events
  POSDM:  "#7c3aed", // violet — human development
  ROMAS:  "#0d9488", // teal — relations & community
  HUMAS:  "#ea580c", // orange — public relations
  DANUS:  "#16a34a", // green — dana usaha / fundraising
  SEBURA: "#db2777", // pink — seni & budaya
  MEDIFO: "#4f46e5", // indigo — media & info
};

export function getDivisionColor(division: string): string {
  return DIVISION_COLORS[division] ?? "#6b7280";
}
