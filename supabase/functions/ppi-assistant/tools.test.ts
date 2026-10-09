// @vitest-environment node
import { it, expect } from "vitest";
import { runTool, TOOL_DEFS, usableArgs, type ToolContext } from "./tools.ts";
import type { Member } from "./permissions.ts";

/** In-memory PostgREST stand-in: eq/gte filters, select columns, order, limit. */
function memDb(tables: Record<string, Record<string, unknown>[]>) {
  let n = 0;
  const parse = (query: string) => {
    const params = new URLSearchParams(query);
    const filters: ((r: Record<string, unknown>) => boolean)[] = [];
    let cols: string[] | null = null;
    let order: { key: string; desc: boolean } | null = null;
    let limit = Infinity;
    for (const [k, v] of params) {
      if (k === "select") cols = v === "*" ? null : v.split(",");
      else if (k === "order") {
        const [key, dir] = v.split(",")[0].split(".");
        order = { key, desc: dir === "desc" };
      } else if (k === "limit") limit = Number(v);
      else if (v.startsWith("eq.")) filters.push((r) => String(r[k]) === v.slice(3));
      else if (v.startsWith("gte.")) filters.push((r) => String(r[k]) >= v.slice(4));
    }
    return { filters, cols, order, limit };
  };
  const t = (name: string) => (tables[name] ??= []);
  const match = (name: string, query: string) => {
    const q = parse(query);
    return t(name).filter((r) => q.filters.every((f) => f(r)));
  };
  return {
    tables,
    async select(name: string, query: string) {
      const q = parse(query);
      let rows = match(name, query);
      if (q.order) {
        const { key, desc } = q.order;
        rows = [...rows].sort((a, b) => (String(a[key] ?? "") < String(b[key] ?? "") ? -1 : 1) * (desc ? -1 : 1));
      }
      rows = rows.slice(0, q.limit);
      return rows.map((r) => (q.cols ? Object.fromEntries(q.cols.map((c) => [c, r[c]])) : { ...r }));
    },
    async insert(name: string, row: Record<string, unknown>) {
      const created = { id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, created_at: `2026-10-09T10:00:${String(n).padStart(2, "0")}Z`, ...row };
      t(name).push(created);
      return created;
    },
    async update(name: string, query: string, patch: Record<string, unknown>) {
      const rows = match(name, query);
      rows.forEach((r) => Object.assign(r, patch));
      return rows;
    },
    async remove(name: string, query: string) {
      const rows = match(name, query);
      tables[name] = t(name).filter((r) => !rows.includes(r));
      return rows.length;
    },
    async count(name: string, query: string) {
      return match(name, query).length;
    },
    async rpc() {
      return null;
    },
  };
}

const SEBURA_ID = "11111111-1111-4111-8111-111111111111";
const AKSI_ID = "22222222-2222-4222-8222-222222222222";
const DANUS_ID = "33333333-3333-4333-8333-333333333333";

function setup() {
  const zone = { current_status: "", current_problem: "", way_out: "", action_needed: "", deadline: null };
  const db = memDb({
    prokers: [
      { id: SEBURA_ID, nama_proker: "Gelora", division: "SEBURA", collab_divisions: [], tanggal: "2026-12-01", type: "External", status: "active", progress: 0, lapak_ready: false, is_berkelanjutan: false, current_zone: "green", red_zone: zone, medium_zone: zone, green_zone: zone },
      { id: AKSI_ID, nama_proker: "Seminar", division: "AKSI", collab_divisions: ["SEBURA"], tanggal: "2026-11-01", type: "Internal", status: "active", progress: 50, lapak_ready: true, is_berkelanjutan: false, current_zone: "green", red_zone: zone, medium_zone: zone, green_zone: zone },
      { id: DANUS_ID, nama_proker: "Jualan Bulanan", division: "DANUS", collab_divisions: [], tanggal: "2026-01-01", type: "Internal", status: "active", progress: 0, lapak_ready: true, is_berkelanjutan: true, berkelanjutan_category: "finance", current_zone: "green", red_zone: zone, medium_zone: zone, green_zone: zone },
    ],
    members: [
      { id: "m1", name: "Mursyid", division: "SEBURA", position: "Kadep", faculty: "FEP", intake: 2023, phone: "0123", birth_date: "2004-01-01", password_hash: "x" },
      { id: "m2", name: "Ratu", division: "DANUS", position: "Wakadep", faculty: "FPP", intake: 2024, phone: "0456", birth_date: "2005-01-01", password_hash: "y" },
    ],
  });
  const ctx = (member: Member): ToolContext => ({ db: db as never, member, now: new Date("2026-10-09T10:00:00Z"), deleteNeedsApproval: true, changed: new Set(), toolCalls: 0, actions: [] });
  const staffSebura: Member = { id: "s1", name: "Staf Sebura", division: "SEBURA", position: "Staff" };
  const staffHumas: Member = { id: "h1", name: "Staf Humas", division: "HUMAS", position: "Staff" };
  const bendahara: Member = { id: "b1", name: "Bendahara", division: "BPH", position: "Bendahara" };
  const admin: Member = { id: "a1", name: "Admin", division: "BPH", position: "Staff", isAdmin: true };
  const item = (c: ToolContext, args: Record<string, unknown>) => runTool(c, "manage_proker_item", JSON.stringify(args));
  return { db, ctx, staffSebura, staffHumas, bendahara, admin, item };
}

it("lets a division's staff fill in their proker's zones, description and Lapak Kerja, and activates the draft", async () => {
  const { db, ctx, staffSebura, item } = setup();
  const c = ctx(staffSebura);

  let r = await runTool(c, "update_proker_details", JSON.stringify({ id: SEBURA_ID, changes: { description: "Pentas seni", current_zone: "red", zone: { current_problem: "Venue belum dapat", deadline: "2026-11-01" } } }));
  expect(r.ok).toBe(true);
  const p = db.tables.prokers[0];
  expect(p).toMatchObject({ description: "Pentas seni", current_zone: "red" });
  expect(p.red_zone).toMatchObject({ current_problem: "Venue belum dapat", deadline: "2026-11-01", way_out: "" });

  // Staff can't rename (that stays with BPH/Kadep/Wakadep).
  r = await runTool(c, "update_proker", JSON.stringify({ id: SEBURA_ID, changes: { nama_proker: "Gelora 2" } }));
  expect(String(r.error)).toMatch(/Izin ditolak/);

  r = await item(c, { action: "add", kind: "task", id: SEBURA_ID, fields: { tugas: "Booking venue", pic: "Mursyid", deadline: "2026-11-01" } });
  expect(r.ok).toBe(true);
  expect(p.lapak_ready).toBe(false); // still needs a link
  r = await item(c, { action: "add", kind: "link", id: SEBURA_ID, fields: { label: "Proposal", url: "https://drive.google.com/x" } });
  expect(String(r.message)).toMatch(/sekarang aktif/);
  expect(p.lapak_ready).toBe(true);

  // Bad link and missing required field are refused.
  expect(String((await item(c, { action: "add", kind: "link", id: SEBURA_ID, fields: { label: "x", url: "javascript:alert(1)" } })).error)).toMatch(/https/);
  expect(String((await item(c, { action: "add", kind: "timeline", id: SEBURA_ID, fields: { notes: "x" } })).error)).toMatch(/label wajib/);
  expect(c.changed.has("prokers")).toBe(true);
});

it("enforces who may touch which proker data", async () => {
  const { db, ctx, staffSebura, staffHumas, bendahara, admin, item } = setup();

  // Other division: no edits, but collab divisions may.
  expect(String((await item(ctx(staffHumas), { action: "add", kind: "task", id: SEBURA_ID, fields: { tugas: "x" } })).error)).toMatch(/Izin ditolak/);
  expect((await item(ctx(staffSebura), { action: "add", kind: "kpi", id: AKSI_ID, fields: { label: "Peserta", target: 100, unit: "orang" } })).ok).toBe(true);
  expect(db.tables.division_kpis[0]).toMatchObject({ division: "AKSI", proker_id: AKSI_ID, target: 100 });

  // RAB: running divisions yes, Bendahara no (comments only), admin yes.
  let r = await item(ctx(staffSebura), { action: "add", kind: "rab", id: SEBURA_ID, fields: { kebutuhan: "Sound system", quantity: 2, satuan: "unit", harga_satuan: "Rp 1.500.000" } });
  expect(r.ok).toBe(true);
  expect(db.tables.lapak_rab[0]).toMatchObject({ quantity: 2, harga_satuan: 1500000 });
  expect(String((await item(ctx(bendahara), { action: "add", kind: "rab", id: SEBURA_ID, fields: { kebutuhan: "x" } })).error)).toMatch(/Izin ditolak/);
  const rabId = String(db.tables.lapak_rab[0].id);
  r = await item(ctx(bendahara), { action: "add", kind: "rab_comment", id: SEBURA_ID, fields: { comment_text: "Harga terlalu mahal", rab_id: rabId } });
  expect(r.ok).toBe(true);
  expect(db.tables.lapak_rab_comments[0]).toMatchObject({ commenter_name: "Bendahara", rab_id: rabId });
  expect(String((await item(ctx(staffSebura), { action: "add", kind: "rab_comment", id: SEBURA_ID, fields: { comment_text: "x" } })).error)).toMatch(/Izin ditolak/);

  // Ongoing comments: anyone posts, only admins delete; no edits.
  r = await item(ctx(staffHumas), { action: "add", kind: "comment", id: SEBURA_ID, fields: { comment_text: "Semangat!" } });
  expect(r.ok).toBe(true);
  const commentId = String(db.tables.ongoing_comments[0].id);
  expect(String((await item(ctx(staffHumas), { action: "delete", kind: "comment", id: SEBURA_ID, item_id: commentId })).error)).toMatch(/Izin ditolak/);
  expect(String((await item(ctx(admin), { action: "update", kind: "comment", id: SEBURA_ID, item_id: commentId, fields: { comment_text: "y" } })).error)).toMatch(/tidak bisa diubah/);
  expect((await item(ctx(admin), { action: "delete", kind: "comment", id: SEBURA_ID, item_id: commentId })).ok).toBe(true);
  expect(db.tables.ongoing_comments).toHaveLength(0);

  // Items of another proker can't be reached through this one.
  expect(String((await item(ctx(admin), { action: "delete", kind: "rab", id: AKSI_ID, item_id: rabId })).error)).toMatch(/tidak ditemukan/);
  expect(db.tables.lapak_rab).toHaveLength(1);
});

it("keeps the proker's progress in sync with its logs and completes prokers like the dashboard", async () => {
  const { db, ctx, staffSebura, item } = setup();
  const c = ctx(staffSebura);
  await item(c, { action: "add", kind: "progress_log", id: AKSI_ID, fields: { progress: 75, log_date: "2026-10-01", note: "Venue fix" } });
  const aksi = db.tables.prokers[1];
  expect(aksi.progress).toBe(75);
  expect(String((await item(c, { action: "add", kind: "progress_log", id: AKSI_ID, fields: { progress: 60 } })).error)).toMatch(/progress harus/);

  const r = await runTool(c, "update_proker_details", JSON.stringify({ id: AKSI_ID, changes: { complete: true, actual_peserta: 120, success_factors: "Promosi bagus" } }));
  expect(r.ok).toBe(true);
  expect(aksi).toMatchObject({ status: "complete", progress: 100, actual_peserta: 120, current_zone: "green" });
  expect((aksi.red_zone as Record<string, unknown>).current_problem).toBe("");
  expect(String((await runTool(c, "update_proker_details", JSON.stringify({ id: AKSI_ID, changes: { zone: { current_status: "x" } } }))).error)).toMatch(/masih berjalan/);
  // Drafts can't be completed.
  expect(String((await runTool(c, "update_proker_details", JSON.stringify({ id: SEBURA_ID, changes: { complete: true } }))).error)).toMatch(/draft/);
});

it("logs sessions only for ongoing prokers, with their category's fields", async () => {
  const { db, ctx, item } = setup();
  const ratu: Member = { id: "m2", name: "Ratu", division: "DANUS", position: "Wakadep" };
  const r = await item(ctx(ratu), { action: "add", kind: "session", id: DANUS_ID, fields: { targeted_income: "500.000", actual_income: 620000, attendees: 5, notes: "Laris" } });
  expect(r.ok).toBe(true);
  expect(db.tables.berkelanjutan_entries[0]).toMatchObject({ targeted_income: 500000, actual_income: 620000, notes: "Laris", entry_date: "2026-10-09" });
  expect(db.tables.berkelanjutan_entries[0].attendees).toBeUndefined(); // not a finance field
  expect(String((await item(ctx(ratu), { action: "add", kind: "session", id: SEBURA_ID, fields: {} })).error)).toMatch(/berkelanjutan|Izin/);
});

it("returns everything about a proker in one call, and members without private fields", async () => {
  const { ctx, staffSebura, staffHumas, item } = setup();
  await item(ctx(staffSebura), { action: "add", kind: "rab", id: SEBURA_ID, fields: { kebutuhan: "Sound", quantity: 2, harga_satuan: 1500000 } });
  await item(ctx(staffSebura), { action: "add", kind: "rab", id: SEBURA_ID, fields: { kebutuhan: "Konsumsi", quantity: 50, harga_satuan: 20000 } });
  const r = (await runTool(ctx(staffHumas), "get_proker", JSON.stringify({ id: SEBURA_ID }))) as Record<string, any>;
  expect(r.proker).toMatchObject({ nama_proker: "Gelora", draft: true, zone: { current: "green" } });
  expect(r.rab.total).toBe(4000000);
  expect(r.your_access).toMatchObject({ edit_data: false, edit_rab: false, manage_proker: false });

  const m = (await runTool(ctx(staffHumas), "list_members", JSON.stringify({ position: "Kadep" }))) as Record<string, any>;
  expect(m.members).toEqual([{ name: "Mursyid", division: "SEBURA", position: "Kadep", faculty: "FEP", intake: 2023 }]);
  expect(JSON.stringify(await runTool(ctx(staffHumas), "list_members", "{}"))).not.toMatch(/0123|2004-01-01|password/);

  const z = (await runTool(ctx(staffHumas), "list_prokers", JSON.stringify({ berkelanjutan: true }))) as Record<string, any>;
  expect(z.prokers.map((p: { nama_proker: string }) => p.nama_proker)).toEqual(["Jualan Bulanan"]);
});

it("answers how-to questions from the Guide", async () => {
  const { ctx, staffHumas } = setup();
  const r = (await runTool(ctx(staffHumas), "read_guide", JSON.stringify({ topic: "lapak kerja activation draft" }))) as { guide: string };
  expect(r.guide).toMatch(/at least 1 task/);
  expect(r.guide.length).toBeLessThan(8000);
  const all = (await runTool(ctx(staffHumas), "read_guide", JSON.stringify({ topic: "zona" }))) as { guide: string };
  expect(all.guide).toMatch(/Quick Start/); // no English match: whole guide
});

it("accepts the new tools' arguments in the schema check", () => {
  expect(usableArgs("manage_proker_item", JSON.stringify({ action: "add", kind: "rab", id: SEBURA_ID, nama_proker: "Gelora", fields: { kebutuhan: "x" } }))).not.toBeNull();
  expect(usableArgs("manage_proker_item", JSON.stringify({ kind: "rab", id: SEBURA_ID }))).toBeNull(); // action missing
  for (const name of ["update_proker_details", "manage_proker_item", "list_members", "list_meetings", "read_guide"]) {
    expect(TOOL_DEFS.some((d) => d.function.name === name)).toBe(true);
  }
});
