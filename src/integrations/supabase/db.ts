import { supabase } from "./client";

// Loosely-typed accessor for tables that are not in the auto-generated
// `types.ts` (Lapak Kerja, tracker_entries, evaluations). The app-level
// interfaces in the hooks provide the real typing; this just lets us call
// `.from("...")` on tables the generated Database type doesn't know about.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sb = supabase as any;
