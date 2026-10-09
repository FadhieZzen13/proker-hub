import { eq, type Db } from "./db.ts";
import type { ToolDef } from "./llm.ts";
import { canCommentRab, canEditProkerData, canEditRab, canManageProker, canWriteProkers, DIVISIONS, isBPH, type Member } from "./permissions.ts";
import { GUIDE_TEXT } from "./guide.ts";

const TYPES = ["Internal", "External"];
const STATUSES = ["active", "complete"];
const PROGRESS = [0, 25, 50, 75, 100];
// Proker berkelanjutan tracker categories (dashboard CATEGORY_LABELS). "custom" needs custom
// parameters, which only the dashboard form can define, so the assistant can't pick it.
const BERK_CATEGORIES = ["finance", "response", "outreach", "people", "training"];
const TRACKER_PROGRESS = ["Not Started", "On Progress", "On Going", "Negotiation", "Cancelled", "Done"];
const PROKER_FIELDS = "id,nama_proker,division,collab_divisions,tanggal,type,status,progress,target_peserta,description,lapak_ready,is_berkelanjutan,berkelanjutan_category,berkelanjutan_notes,current_zone";
const POSITIONS = ["Kadep", "Wakadep", "Staff", "Secretary", "Bendahara"];
const ZONES = ["red", "medium", "green"];
const ZONE_FIELDS = ["current_status", "current_problem", "way_out", "action_needed", "deadline"];
const EMPTY_ZONE = { current_status: "", current_problem: "", way_out: "", action_needed: "", deadline: null };

export interface ToolContext {
  db: Db;
  member: Member;
  now: Date;
  deleteNeedsApproval: boolean;
  changed: Set<"prokers" | "tracker">;
  /** Number of tool calls made in this request (reads included). */
  toolCalls: number;
  /** What actually happened for each write attempt; shown to the user as receipts. */
  actions: ActionReceipt[];
  /** Tool calls whose arguments couldn't be read (model formatting problem). */
  badArgs?: number;
}

export interface ActionReceipt {
  tool: string;
  outcome: "done" | "requested" | "denied" | "error";
  label: string;
}

type Args = Record<string, unknown>;
type Result = Record<string, unknown>;

class ToolError extends Error {}
const fail = (msg: string): never => {
  throw new ToolError(msg);
};

// ---------- validation ----------
const str = (v: unknown, name: string, max = 500): string => {
  if (typeof v !== "string" || !v.trim()) fail(`${name} wajib diisi.`);
  return (v as string).trim().slice(0, max);
};
const optStr = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const date = (v: unknown, name: string) => {
  const s = str(v, name, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) fail(`${name} harus format YYYY-MM-DD.`);
  return s;
};
const month = (v: unknown, now: Date) => {
  if (v === undefined || v === null || v === "") return now.toISOString().slice(0, 7);
  const s = str(v, "month", 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) fail("month harus format YYYY-MM.");
  return s;
};
const oneOf = <T>(v: unknown, allowed: T[], name: string): T => {
  if (!allowed.includes(v as T)) fail(`${name} harus salah satu dari: ${allowed.join(", ")}.`);
  return v as T;
};
const divisionList = (v: unknown) => {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) fail("collab_divisions harus berupa daftar divisi.");
  return (v as unknown[]).map((d) => oneOf(d, [...DIVISIONS], "collab_divisions"));
};

// ---------- proker items (Lapak Kerja, RAB, KPIs, progress logs, sessions, comments) ----------
type FieldType = "text" | "longtext" | "date" | "number" | "bool" | "url" | "progress";
type ProkerRow = Result & { id: string; nama_proker: string; division: string; collab_divisions?: string[] | null };

interface ItemKind {
  table: string;
  label: string; // shown in receipts
  fields: Record<string, FieldType>;
  required?: string[];
  sorted?: boolean; // table has a `sort` column
  canWrite: (m: Member, p: ProkerRow) => boolean;
  /** Stricter rule for deleting, if any (dashboard: only admins delete comments and sessions). */
  canDelete?: (m: Member, p: ProkerRow) => boolean;
  addOnly?: boolean; // no updates
  summary: (row: Args) => string;
}

const adminOnly = (m: Member) => !!m.isAdmin;
const anyone = () => true;

// Log Session columns per berkelanjutan category (dashboard BerkelanjutanTracker).
const SESSION_FIELDS: Record<string, Record<string, FieldType>> = {
  finance: { targeted_income: "number", actual_income: "number" },
  response: { messages_per_day: "number", messages_replied_per_day: "number", response_time_minutes: "number" },
  outreach: { posts_count: "number", total_reach: "number", new_followers: "number", content_notes: "longtext" },
  people: {
    meals_bought: "number", meals_given_out: "number", attendees: "number", location: "text",
    school_visited: "text", participants_count: "number", ppi_members_attendance: "number",
  },
  training: {
    topic: "text", speaker: "text", target_audience: "number", actual_audience: "number",
    duration_minutes: "number", satisfaction_score: "number", training_notes: "longtext", location: "text",
  },
};

export const ITEM_KINDS: Record<string, ItemKind> = {
  task: {
    table: "lapak_tasks", label: "Tugas", sorted: true, required: ["tugas"], canWrite: canEditProkerData,
    fields: { tugas: "text", pic: "text", link: "url", deadline: "date", done: "bool", notes: "longtext" },
    summary: (r) => String(r.tugas ?? ""),
  },
  link: {
    table: "lapak_links", label: "Link", sorted: true, required: ["label", "url"], canWrite: canEditProkerData,
    fields: { label: "text", url: "url" },
    summary: (r) => String(r.label ?? ""),
  },
  timeline: {
    table: "lapak_timeline", label: "Timeline", sorted: true, required: ["label"], canWrite: canEditProkerData,
    fields: { label: "text", event_date: "date", notes: "longtext" },
    summary: (r) => `${r.label ?? ""}${r.event_date ? ` (${r.event_date})` : ""}`,
  },
  juknis: {
    table: "lapak_juknis", label: "Juknis", sorted: true, canWrite: canEditProkerData,
    fields: { waktu: "text", durasi: "text", keterangan: "text", deskripsi: "longtext", pengisi: "text", penanggung_jawab: "text", properti: "text", notes: "longtext" },
    summary: (r) => String(r.keterangan || r.deskripsi || r.waktu || ""),
  },
  rab: {
    table: "lapak_rab", label: "RAB", sorted: true, required: ["kebutuhan"], canWrite: canEditRab,
    fields: { kebutuhan: "text", quantity: "number", satuan: "text", harga_satuan: "number" },
    summary: (r) => `${r.kebutuhan ?? ""}${r.quantity !== undefined ? ` (${r.quantity} × ${r.harga_satuan ?? 0})` : ""}`,
  },
  kpi: {
    table: "division_kpis", label: "KPI", sorted: true, required: ["label"], canWrite: canEditProkerData,
    fields: { label: "text", target: "number", current: "number", unit: "text" },
    summary: (r) => `${r.label ?? ""}${r.target !== undefined ? ` (${r.current ?? 0}/${r.target} ${r.unit ?? ""})`.trimEnd() : ""}`,
  },
  progress_log: {
    table: "proker_progress_logs", label: "Log progress", required: ["progress"], canWrite: canEditProkerData,
    fields: { log_date: "date", progress: "progress", note: "longtext" },
    summary: (r) => `${r.progress ?? ""}%${r.log_date ? ` (${r.log_date})` : ""}`,
  },
  session: {
    table: "berkelanjutan_entries", label: "Sesi", canWrite: canEditProkerData, canDelete: adminOnly,
    fields: { entry_date: "date", notes: "longtext" }, // + category fields, see sessionFields()
    summary: (r) => `sesi ${r.entry_date ?? ""}`.trim(),
  },
  comment: {
    table: "ongoing_comments", label: "Komentar", required: ["comment_text"], canWrite: anyone, canDelete: adminOnly, addOnly: true,
    fields: { comment_text: "longtext" },
    summary: (r) => String(r.comment_text ?? "").slice(0, 60),
  },
  rab_comment: {
    table: "lapak_rab_comments", label: "Komentar RAB", required: ["comment_text"], canWrite: (m) => canCommentRab(m),
    fields: { comment_text: "longtext", rab_id: "text" },
    summary: (r) => String(r.comment_text ?? "").slice(0, 60),
  },
  notes: {
    table: "lapak_notes", label: "Catatan Lapak Kerja", canWrite: canEditProkerData,
    fields: { content: "longtext" },
    summary: () => "",
  },
};

/** Validate one field value for its type. `null` clears optional fields. */
function fieldValue(type: FieldType, name: string, v: unknown): unknown {
  if (v === null || v === "") {
    if (type === "bool" || type === "progress") fail(`${name} wajib diisi.`);
    return type === "number" || type === "date" ? null : "";
  }
  switch (type) {
    case "text":
      return str(v, name, 300);
    case "longtext":
      return str(v, name, 4000);
    case "url": {
      const u = str(v, name, 1000);
      if (!/^https?:\/\/\S+$/i.test(u)) fail(`${name} harus link yang diawali https://`);
      return u;
    }
    case "date":
      return date(v, name);
    case "number": {
      const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
      if (!Number.isFinite(n)) fail(`${name} harus angka.`);
      return n;
    }
    case "bool":
      return v === true || v === "true";
    case "progress":
      return oneOf(Number(v), PROGRESS, name);
  }
}

// ---------- logging ----------
async function log(ctx: ToolContext, tool: string, args: Args, outcome: "done" | "requested" | "denied" | "error", detail: string) {
  try {
    await ctx.db.insert("ai_action_log", { member_id: ctx.member.id, member_name: ctx.member.name, tool, args, outcome, detail: detail.slice(0, 500) });
  } catch {
    /* logging must never break the chat */
  }
}

/** The proker was deleted earlier (logged); delete_proker reports that as done, other tools as an error. */
class AlreadyDeleted extends ToolError {}

/**
 * Rows whose id matches `raw`. The gateway sometimes drops characters inside tool arguments
 * ("8fb1b82e-5104-..." arrives as "8fb182e-5104..."), so when there's no exact match we accept
 * ids that contain the received hex characters in order. Callers must still get exactly one row.
 */
export function matchIds<T extends { id?: unknown }>(raw: string, rows: T[]): T[] {
  const exact = rows.filter((r) => String(r.id) === raw);
  if (exact.length) return exact;
  const want = raw.toLowerCase().replace(/[^0-9a-f]/g, "");
  if (want.length < 12) return [];
  const isSubsequence = (id: string) => {
    let i = 0;
    for (const ch of id) if (ch === want[i]) i++;
    return i === want.length;
  };
  return rows.filter((r) => isSubsequence(String(r.id).toLowerCase().replace(/-/g, "")));
}

/** Find one proker by id and/or name (name is the fallback when the id arrives garbled). */
async function findProker(ctx: ToolContext, id: unknown, name?: unknown) {
  const rawId = typeof id === "string" ? id.trim() : "";
  const wantName = optStr(name, 200)?.toLowerCase();
  if (!rawId && !wantName) fail("Sebutkan id atau nama proker.");
  const all = await ctx.db.select<Result>("prokers", `select=${PROKER_FIELDS}`);
  let hits = rawId ? matchIds(rawId, all) : all;
  if (wantName) {
    const pool = hits.length ? hits : all;
    const exact = pool.filter((p) => String(p.nama_proker).toLowerCase() === wantName);
    hits = exact.length ? exact : pool.filter((p) => String(p.nama_proker).toLowerCase().includes(wantName));
  }
  if (!hits.length) {
    // Already deleted (e.g. the user resent "hapus X" after a hiccup)? Say so instead of "not found".
    const recent = await ctx.db.select<Result>(
      "ai_action_log",
      `select=detail,args&tool=eq.delete_proker&outcome=eq.done&created_at=gte.${encodeURIComponent(new Date(ctx.now.getTime() - 3600_000).toISOString())}&order=created_at.desc&limit=20`
    );
    const gone = recent.find((r) => {
      const a = (r.args ?? {}) as Args;
      return (rawId && typeof a.id === "string" && matchIds(rawId, [{ id: a.id }]).length) || (wantName && String(a.nama_proker ?? "").toLowerCase() === wantName);
    });
    if (gone) throw new AlreadyDeleted(String(gone.detail || "Proker ini sudah dihapus."));
    fail("Proker tidak ditemukan. Coba cek lagi nama prokernya.");
  }
  if (hits.length > 1) {
    const list = hits.slice(0, 5).map((p) => `"${p.nama_proker}" (${p.division}, ${p.tanggal})`).join("; ");
    fail(`Ada ${hits.length} proker yang cocok: ${list}. Tanyakan pengguna yang mana.`);
  }
  return hits[0];
}

/** One tracker entry by id (tolerating dropped characters). Members only see their own. */
async function findTrackerEntry(ctx: ToolContext, id: unknown): Promise<Result> {
  const raw = str(id, "id", 64);
  const scope = ctx.member.isAdmin ? "" : `&member_id=${eq(ctx.member.id)}`;
  const hits = matchIds(raw, await ctx.db.select<Result>("tracker_entries", `select=id,member_id${scope}`));
  // Members get one message for "not yours" and "doesn't exist", so ids aren't probeable.
  if (hits.length !== 1) fail(ctx.member.isAdmin ? "Entri tracker tidak ditemukan." : "Izin ditolak atau entri tidak ditemukan: kamu hanya boleh mengubah tracker milikmu sendiri.");
  return hits[0];
}

/**
 * Whose tracker a call is about. Members: always themselves (member_name is refused).
 * Admins: themselves, or exactly one member whose name matches member_name.
 */
async function trackerOwner(ctx: ToolContext, memberName: unknown): Promise<{ id: string; name: string; division: string }> {
  const wanted = optStr(memberName, 100);
  if (!wanted) return ctx.member;
  if (!ctx.member.isAdmin) fail("Izin ditolak: kamu hanya boleh mengisi tracker milikmu sendiri.");
  const matches = await ctx.db.select<{ id: string; name: string; division: string }>(
    "members",
    `select=id,name,division&name=ilike.${encodeURIComponent(`*${wanted.replace(/[*,()]/g, "")}*`)}&limit=6`
  );
  if (!matches.length) fail(`Anggota "${wanted}" tidak ditemukan.`);
  if (matches.length > 1) fail(`Nama "${wanted}" cocok dengan beberapa anggota: ${matches.map((m) => m.name).join(", ")}. Sebutkan nama yang lebih lengkap.`);
  return matches[0];
}

function requireManage(ctx: ToolContext, division: string) {
  if (!canWriteProkers(ctx.member)) fail("Izin ditolak: hanya BPH, Kadep, dan Wakadep yang boleh mengubah proker.");
  if (!canManageProker(ctx.member, division)) fail(`Izin ditolak: kamu hanya boleh mengelola proker divisi ${ctx.member.division}.`);
}

// ---------- tool implementations ----------
/** is_berkelanjutan / berkelanjutan_category / berkelanjutan_notes from tool args (only the keys given). */
function berkelanjutan(a: Args): Args {
  const out: Args = {};
  if (a.is_berkelanjutan !== undefined) out.is_berkelanjutan = a.is_berkelanjutan === true || a.is_berkelanjutan === "true";
  if (a.berkelanjutan_category !== undefined) {
    out.berkelanjutan_category = a.berkelanjutan_category === null || a.berkelanjutan_category === "" ? null : oneOf(a.berkelanjutan_category, BERK_CATEGORIES, "berkelanjutan_category");
  }
  if (a.berkelanjutan_notes !== undefined) out.berkelanjutan_notes = optStr(a.berkelanjutan_notes) ?? null;
  return out;
}

/** Drop null / empty values so tool results stay small. */
function compact<T>(v: T): T {
  if (Array.isArray(v)) return v.map(compact) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x === null || x === undefined || x === "" || (Array.isArray(x) && !x.length)) continue;
      out[k] = compact(x);
    }
    return out as T;
  }
  return v;
}

/** Fields a kind accepts; Log Session adds the proker category's columns. */
function sessionAware(kind: string, p: ProkerRow): Record<string, FieldType> {
  const base = ITEM_KINDS[kind].fields;
  if (kind !== "session") return base;
  return { ...base, ...(SESSION_FIELDS[String(p.berkelanjutan_category)] ?? {}) };
}

/** Custom-category sessions: values keyed by the proker's own custom parameters. */
function customData(p: ProkerRow, given: Args): Args {
  const params = Array.isArray(p.custom_params) ? (p.custom_params as { key: string; label: string; type: string }[]) : [];
  const src = (given.custom_data && typeof given.custom_data === "object" ? given.custom_data : given) as Args;
  const out: Args = {};
  for (const prm of params) {
    const v = src[prm.key] ?? src[prm.label];
    if (v === undefined) continue;
    out[prm.key] = prm.type === "number" ? fieldValue("number", prm.label, v) : fieldValue("text", prm.label, v);
  }
  return out;
}

/** One child row of a proker by id (tolerating characters dropped by the gateway). */
async function findItem(ctx: ToolContext, table: string, prokerId: string, id: unknown): Promise<Result> {
  const raw = str(id, "item_id", 64);
  const rows = await ctx.db.select<Result>(table, `select=*&proker_id=${eq(prokerId)}`);
  const hits = matchIds(raw, rows);
  if (hits.length !== 1) fail("Data itu tidak ditemukan di proker ini. Cek lagi lewat detail proker.");
  return hits[0];
}

const handlers: Record<string, (ctx: ToolContext, a: Args) => Promise<Result>> = {
  async list_prokers(ctx, a) {
    const q = [`select=${PROKER_FIELDS}`, "order=tanggal.asc", "limit=60"];
    if (a.division) q.push(`division=${eq(oneOf(a.division, [...DIVISIONS], "division"))}`);
    if (a.status) q.push(`status=${eq(oneOf(a.status, STATUSES, "status"))}`);
    if (a.zone) q.push(`current_zone=${eq(oneOf(a.zone, ZONES, "zone"))}`, "status=eq.active");
    if (a.berkelanjutan !== undefined) q.push(`is_berkelanjutan=eq.${a.berkelanjutan === true || a.berkelanjutan === "true"}`);
    if (a.draft !== undefined) q.push(`lapak_ready=eq.${!(a.draft === true || a.draft === "true")}`);
    let rows = await ctx.db.select<Result>("prokers", q.join("&"));
    const s = optStr(a.search, 100)?.toLowerCase();
    if (s) rows = rows.filter((r) => String(r.nama_proker ?? "").toLowerCase().includes(s));
    return { count: rows.length, prokers: rows.map((r) => ({ ...r, draft: r.lapak_ready === false, lapak_ready: undefined })) };
  },

  async get_proker(ctx, a) {
    const found = await findProker(ctx, a.id, a.nama_proker);
    const id = eq(String(found.id));
    const take = (table: string, query: string) => ctx.db.select<Result>(table, query).catch(() => [] as Result[]);
    const [[p = found], kpis, logs, links, tasks, timeline, juknis, rab, notes, rabComments, comments] = await Promise.all([
      take("prokers", `select=*&id=${id}`),
      take("division_kpis", `select=id,label,target,current,unit&proker_id=${id}&order=sort.asc`),
      take("proker_progress_logs", `select=id,log_date,progress,note&proker_id=${id}&order=log_date.desc&limit=10`),
      take("lapak_links", `select=id,label,url&proker_id=${id}&order=sort.asc`),
      take("lapak_tasks", `select=id,tugas,pic,deadline,done,link,notes,members&proker_id=${id}&order=sort.asc`),
      take("lapak_timeline", `select=id,label,event_date,notes&proker_id=${id}&order=event_date.asc`),
      take("lapak_juknis", `select=id,waktu,durasi,keterangan,deskripsi,pengisi,penanggung_jawab,properti,notes&proker_id=${id}&order=sort.asc`),
      take("lapak_rab", `select=id,kebutuhan,quantity,satuan,harga_satuan&proker_id=${id}&order=sort.asc`),
      take("lapak_notes", `select=content&proker_id=${id}`),
      take("lapak_rab_comments", `select=id,rab_id,commenter_name,comment_text,created_at&proker_id=${id}&order=created_at.desc&limit=10`),
      take("ongoing_comments", `select=id,commenter_name,commenter_division,comment_text,created_at&proker_id=${id}&order=created_at.desc&limit=10`),
    ]);
    const sessions = p.is_berkelanjutan ? await take("berkelanjutan_entries", `select=*&proker_id=${id}&order=entry_date.desc&limit=10`) : [];
    const zone = String(p.current_zone ?? "green");
    const m = ctx.member;
    return compact({
      proker: {
        id: p.id, nama_proker: p.nama_proker, division: p.division, collab_divisions: p.collab_divisions, tanggal: p.tanggal,
        type: p.type, status: p.status, draft: p.lapak_ready === false, progress: p.progress, target_peserta: p.target_peserta,
        description: p.description, is_berkelanjutan: p.is_berkelanjutan, berkelanjutan_category: p.berkelanjutan_category,
        berkelanjutan_notes: p.berkelanjutan_notes,
        zone: p.status === "active" ? { current: zone, ...(p[`${zone}_zone`] as Result ?? {}) } : undefined,
        completion: p.status === "complete"
          ? { actual_peserta: p.actual_peserta, success_factors: p.success_factors, improvements: p.improvements, notes: p.notes, completed_at: p.completed_at }
          : undefined,
        promotion: p.promotion_data, engagement: p.engagement_data, rating: p.rating_data,
      },
      kpis,
      progress_logs: logs,
      lapak_kerja: {
        links,
        tasks: tasks.map((t) => ({ ...t, members: Array.isArray(t.members) ? (t.members as { name?: string }[]).map((x) => x.name).filter(Boolean) : undefined })),
        timeline,
        juknis,
        notes: notes[0]?.content,
      },
      rab: { rows: rab, total: rab.reduce((sum, r) => sum + Number(r.quantity ?? 0) * Number(r.harga_satuan ?? 0), 0) },
      rab_comments: rabComments,
      comments,
      sessions,
      your_access: {
        manage_proker: canManageProker(m, String(p.division)),
        edit_data: canEditProkerData(m, p as ProkerRow),
        edit_rab: canEditRab(m, p as ProkerRow),
        comment_rab: canCommentRab(m),
      },
    });
  },

  async update_proker_details(ctx, a) {
    const current = await findProker(ctx, a.id, a.nama_proker);
    const [p] = await ctx.db.select<ProkerRow>("prokers", `select=*&id=${eq(String(current.id))}`);
    if (!canEditProkerData(ctx.member, p)) fail(`Izin ditolak: data proker ini hanya bisa diubah divisi ${p.division} dan kolaborasinya.`);
    const c = (a.changes ?? {}) as Args;
    const patch: Args = {};
    if (c.description !== undefined) patch.description = optStr(c.description, 4000) || null;
    if (c.notes !== undefined) patch.notes = optStr(c.notes, 4000) || null;
    if (c.success_factors !== undefined) patch.success_factors = optStr(c.success_factors, 4000) || null;
    if (c.improvements !== undefined) patch.improvements = optStr(c.improvements, 4000) || null;
    if (c.actual_peserta !== undefined) patch.actual_peserta = Math.max(0, Math.round(Number(c.actual_peserta)) || 0);
    if (c.current_zone !== undefined || c.zone !== undefined) {
      if (p.status === "complete") fail("Zona hanya untuk proker yang masih berjalan.");
      if (c.current_zone !== undefined) patch.current_zone = oneOf(c.current_zone, ZONES, "current_zone");
    }
    if (c.zone !== undefined) {
      if (!c.zone || typeof c.zone !== "object" || Array.isArray(c.zone)) fail("zone harus berisi detail zona.");
      const which = String(patch.current_zone ?? p.current_zone ?? "green");
      const given = c.zone as Args;
      const next: Args = { ...EMPTY_ZONE, ...((p[`${which}_zone`] as Args) ?? {}) };
      for (const k of ZONE_FIELDS) {
        if (given[k] === undefined) continue;
        next[k] = k === "deadline" ? (given[k] ? date(given[k], "deadline") : null) : optStr(given[k], 1000) ?? "";
      }
      patch[`${which}_zone`] = next;
    }
    if (c.complete === true || c.complete === "true") {
      if (p.is_berkelanjutan) fail("Proker berkelanjutan tidak punya tahap selesai.");
      if (p.lapak_ready === false) fail("Proker ini masih draft. Lengkapi Lapak Kerja dulu (minimal 1 tugas dan 1 link).");
      Object.assign(patch, {
        status: "complete", progress: 100, completed_at: ctx.now.toISOString(),
        current_zone: "green", red_zone: { ...EMPTY_ZONE }, medium_zone: { ...EMPTY_ZONE }, green_zone: { ...EMPTY_ZONE },
      });
    }
    if (!Object.keys(patch).length) fail("Tidak ada perubahan yang valid.");
    patch.updated_at = ctx.now.toISOString();
    await ctx.db.update("prokers", `id=${eq(p.id)}`, patch);
    ctx.changed.add("prokers");
    const done = patch.status === "complete" ? " dan ditandai selesai" : "";
    return { ok: true, message: `Detail proker "${p.nama_proker}" diperbarui${done}.`, changed_fields: Object.keys(patch).filter((k) => k !== "updated_at") };
  },

  async manage_proker_item(ctx, a) {
    const action = oneOf(a.action, ["add", "update", "delete"], "action");
    const kindName = oneOf(a.kind, Object.keys(ITEM_KINDS), "kind");
    const kind = ITEM_KINDS[kindName];
    const found = await findProker(ctx, a.id, a.nama_proker);
    const [p] = await ctx.db.select<ProkerRow>("prokers", `select=*&id=${eq(String(found.id))}`);
    const m = ctx.member;
    const allowed = action === "delete" ? (kind.canDelete ?? kind.canWrite)(m, p) : kind.canWrite(m, p);
    if (!allowed) fail(`Izin ditolak: kamu tidak bisa ${action === "add" ? "menambah" : action === "update" ? "mengubah" : "menghapus"} ${kind.label} di proker "${p.nama_proker}".`);
    if (kindName === "session" && !p.is_berkelanjutan) fail("Sesi hanya untuk proker berkelanjutan.");
    if (action === "update" && kind.addOnly) fail(`${kind.label} tidak bisa diubah, hanya ditambah atau dihapus.`);

    const fields = sessionAware(kindName, p);
    const given = (a.fields && typeof a.fields === "object" && !Array.isArray(a.fields) ? a.fields : {}) as Args;
    const row: Args = {};
    for (const [k, v] of Object.entries(given)) {
      if (k === "custom_data" && kindName === "session") continue;
      if (fields[k]) row[k] = fieldValue(fields[k], k, v);
    }
    if (kindName === "session" && p.berkelanjutan_category === "custom") row.custom_data = customData(p, given);
    const pid = eq(p.id);
    let message: string;
    let createdId: unknown;

    if (kindName === "notes") {
      if (action === "delete") row.content = "";
      else if (!row.content) fail("Isi catatannya dulu.");
      const content = row.content ?? "";
      const existing = await ctx.db.select("lapak_notes", `select=proker_id&proker_id=${pid}`);
      if (existing.length) await ctx.db.update("lapak_notes", `proker_id=${pid}`, { content, updated_at: ctx.now.toISOString() });
      else await ctx.db.insert("lapak_notes", { proker_id: p.id, content, updated_at: ctx.now.toISOString() });
      message = `Catatan Lapak Kerja "${p.nama_proker}" ${content ? "disimpan" : "dikosongkan"}.`;
    } else if (action === "add") {
      for (const k of kind.required ?? []) if (row[k] === undefined || row[k] === "" || row[k] === null) fail(`${k} wajib diisi untuk ${kind.label}.`);
      if (!Object.keys(row).length && kindName !== "session") fail(`Isi dulu data ${kind.label}-nya.`);
      const insert: Args = { ...row, proker_id: p.id };
      if (kind.sorted) {
        const [last] = await ctx.db.select<Result>(kind.table, `select=sort&proker_id=${pid}&order=sort.desc&limit=1`);
        insert.sort = Number(last?.sort ?? -1) + 1;
      }
      if (kindName === "kpi") insert.division = p.division;
      if (kindName === "progress_log" && !insert.log_date) insert.log_date = ctx.now.toISOString().slice(0, 10);
      if (kindName === "session" && !insert.entry_date) insert.entry_date = ctx.now.toISOString().slice(0, 10);
      if (kindName === "comment" || kindName === "rab_comment") Object.assign(insert, { commenter_name: m.name, commenter_division: m.division });
      if (kindName === "rab_comment" && insert.rab_id) insert.rab_id = (await findItem(ctx, "lapak_rab", p.id, insert.rab_id)).id;
      const created = await ctx.db.insert<Result>(kind.table, insert);
      message = `${kind.label} ditambahkan ke "${p.nama_proker}": ${kind.summary(insert)}`.replace(/: $/, ".");
      createdId = created?.id;
    } else {
      const item = await findItem(ctx, kind.table, p.id, a.item_id);
      const filter = `id=${eq(String(item.id))}&proker_id=${pid}`;
      if (action === "delete") {
        await ctx.db.remove(kind.table, filter);
        message = `${kind.label} dihapus dari "${p.nama_proker}": ${kind.summary(item)}`.replace(/: $/, ".");
      } else {
        if (!Object.keys(row).length) fail("Tidak ada perubahan yang valid.");
        if (kindName === "rab_comment") row.updated_at = ctx.now.toISOString();
        if (kindName === "kpi") row.updated_at = ctx.now.toISOString();
        await ctx.db.update(kind.table, filter, row);
        message = `${kind.label} di "${p.nama_proker}" diperbarui: ${kind.summary({ ...item, ...row })}`.replace(/: $/, ".");
      }
    }

    // Same side effects as the dashboard.
    if (kindName === "progress_log") {
      const [latest] = await ctx.db.select<Result>("proker_progress_logs", `select=progress&proker_id=${pid}&order=log_date.desc,created_at.desc&limit=1`);
      await ctx.db.update("prokers", `id=${pid}`, { progress: Number(latest?.progress ?? 0), updated_at: ctx.now.toISOString() });
    }
    if ((kindName === "task" || kindName === "link") && action === "add" && p.lapak_ready === false) {
      const [tasks, links] = await Promise.all([
        ctx.db.select("lapak_tasks", `select=id&proker_id=${pid}&limit=1`),
        ctx.db.select("lapak_links", `select=id&proker_id=${pid}&limit=1`),
      ]);
      if (tasks.length && links.length) {
        await ctx.db.update("prokers", `id=${pid}`, { lapak_ready: true, updated_at: ctx.now.toISOString() });
        message += ` Proker "${p.nama_proker}" sekarang aktif (bukan draft lagi).`;
      }
    }
    ctx.changed.add("prokers");
    return { ok: true, message, ...(createdId ? { item_id: createdId } : {}) };
  },

  async list_members(ctx, a) {
    // Only what the Members page shows to everyone; never phone numbers or birth dates.
    const q = ["select=name,division,position,faculty,intake", "order=division.asc,name.asc"];
    if (a.division) q.push(`division=${eq(oneOf(a.division, [...DIVISIONS], "division"))}`);
    if (a.position) q.push(`position=${eq(oneOf(a.position, POSITIONS, "position"))}`);
    let rows = await ctx.db.select<Result>("members", q.join("&"));
    const s = optStr(a.search, 100)?.toLowerCase();
    if (s) rows = rows.filter((r) => String(r.name ?? "").toLowerCase().includes(s));
    return { count: rows.length, members: rows.slice(0, 80) };
  },

  async list_meetings(ctx, a) {
    const q = ["select=division,topic,scheduled_at,status,planned_participants,actual_participants,meeting_notes", "order=scheduled_at.desc", "limit=30"];
    if (a.division) q.push(`division=${eq(oneOf(a.division, [...DIVISIONS], "division"))}`);
    if (a.status) q.push(`status=${eq(String(a.status))}`);
    return { meetings: compact(await ctx.db.select<Result>("meetings", q.join("&"))) };
  },

  async read_guide(_ctx, a) {
    const sections = GUIDE_TEXT.split(/\n(?=## )/);
    const words = (optStr(a.topic, 200) ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const scored = sections
      .map((sec) => ({ sec, score: words.filter((w) => sec.toLowerCase().includes(w)).length }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3);
    // Nothing matched (e.g. an Indonesian word for an English heading): the whole guide is small enough.
    return { guide: scored.length ? scored.map((x) => x.sec).join("\n\n") : GUIDE_TEXT };
  },

  async create_proker(ctx, a) {
    const division = oneOf(a.division ?? ctx.member.division, [...DIVISIONS], "division");
    requireManage(ctx, division);
    const row = {
      nama_proker: str(a.nama_proker, "nama_proker", 200),
      division,
      tanggal: date(a.tanggal, "tanggal"),
      type: oneOf(a.type, TYPES, "type"),
      target_peserta: Math.max(0, Math.round(Number(a.target_peserta ?? 0)) || 0),
      description: optStr(a.description) ?? null,
      collab_divisions: (divisionList(a.collab_divisions) ?? []).filter((d) => d !== division),
      created_by_member_id: ctx.member.id,
      lapak_ready: false, // same as the dashboard: drafts until Lapak Kerja is complete
      ...berkelanjutan(a),
    };
    const created = await ctx.db.insert<Result>("prokers", row);
    ctx.changed.add("prokers");
    return { ok: true, message: `Proker "${row.nama_proker}" dibuat (draft, ${division}, ${row.tanggal}).`, proker: { id: created.id, nama_proker: created.nama_proker, division, tanggal: row.tanggal } };
  },

  async update_proker(ctx, a) {
    const current = await findProker(ctx, a.id, a.nama_proker);
    requireManage(ctx, String(current.division));
    const c = (a.changes ?? {}) as Args;
    const patch: Args = {};
    if (c.nama_proker !== undefined) patch.nama_proker = str(c.nama_proker, "nama_proker", 200);
    if (c.tanggal !== undefined) patch.tanggal = date(c.tanggal, "tanggal");
    if (c.type !== undefined) patch.type = oneOf(c.type, TYPES, "type");
    if (c.status !== undefined) patch.status = oneOf(c.status, STATUSES, "status");
    if (c.progress !== undefined) patch.progress = oneOf(Number(c.progress), PROGRESS, "progress");
    if (c.target_peserta !== undefined) patch.target_peserta = Math.max(0, Math.round(Number(c.target_peserta)) || 0);
    if (c.description !== undefined) patch.description = optStr(c.description) ?? null;
    if (c.collab_divisions !== undefined) patch.collab_divisions = divisionList(c.collab_divisions);
    Object.assign(patch, berkelanjutan(c));
    if (c.division !== undefined) {
      const to = oneOf(c.division, [...DIVISIONS], "division");
      if (!isBPH(ctx.member) && to !== current.division) fail("Izin ditolak: hanya BPH yang boleh memindahkan proker ke divisi lain.");
      patch.division = to;
    }
    if (!Object.keys(patch).length) fail("Tidak ada perubahan yang valid.");
    if (patch.status === "complete") patch.completed_at = ctx.now.toISOString();
    patch.updated_at = ctx.now.toISOString();
    await ctx.db.update("prokers", `id=${eq(String(current.id))}`, patch);
    ctx.changed.add("prokers");
    return { ok: true, message: `Proker "${current.nama_proker}" diperbarui.`, changed_fields: Object.keys(patch).filter((k) => k !== "updated_at") };
  },

  async delete_proker(ctx, a) {
    let current: Result;
    try {
      current = await findProker(ctx, a.id, a.nama_proker);
    } catch (e) {
      if (e instanceof AlreadyDeleted) return { ok: true, status: "deleted", message: `${e.message.replace(/\.$/, "")} sebelumnya, jadi sudah tidak ada.` };
      throw e;
    }
    requireManage(ctx, String(current.division));
    const reason = optStr(a.reason, 500) ?? "";
    if (ctx.deleteNeedsApproval) {
      const pending = await ctx.db.select<Result>("ai_delete_requests", `select=id&status=eq.pending&proker_id=${eq(String(current.id))}`);
      if (pending.length) return { ok: true, status: "requested", message: `Permintaan hapus "${current.nama_proker}" sudah menunggu persetujuan admin.` };
      await ctx.db.insert("ai_delete_requests", {
        proker_id: current.id,
        proker_snapshot: current,
        requested_by: ctx.member.id,
        requested_by_name: ctx.member.name,
        reason,
        status: "pending",
      });
      return { ok: true, status: "requested", message: `Permintaan hapus "${current.nama_proker}" dikirim ke admin. Proker baru terhapus setelah disetujui.` };
    }
    await ctx.db.remove("prokers", `id=${eq(String(current.id))}`);
    ctx.changed.add("prokers");
    return { ok: true, status: "deleted", message: `Proker "${current.nama_proker}" dihapus.` };
  },

  async get_my_tracker(ctx, a) {
    const owner = await trackerOwner(ctx, a.member_name);
    const m = month(a.month, ctx.now);
    const rows = await ctx.db.select<Result>(
      "tracker_entries",
      `select=id,month,description,progress,sort&member_id=${eq(owner.id)}&month=${eq(m)}&order=sort.asc,created_at.asc`
    );
    return { member: owner.name, month: m, entries: rows };
  },

  async add_tracker_entry(ctx, a) {
    const owner = await trackerOwner(ctx, a.member_name); // members: always themselves
    const m = month(a.month, ctx.now);
    const existing = await ctx.db.select<Result>("tracker_entries", `select=sort&member_id=${eq(owner.id)}&month=${eq(m)}&order=sort.desc&limit=1`);
    const created = await ctx.db.insert<Result>("tracker_entries", {
      member_id: owner.id, // never a raw id from the model
      division: owner.division,
      month: m,
      description: str(a.description, "description", 1000),
      progress: a.progress === undefined ? "On Progress" : oneOf(a.progress, TRACKER_PROGRESS, "progress"),
      sort: Number(existing[0]?.sort ?? -1) + 1,
    });
    ctx.changed.add("tracker");
    const whose = owner.id === ctx.member.id ? "" : ` untuk ${owner.name}`;
    return { ok: true, message: `Tracker ${m}${whose} ditambahkan: "${String(created.description ?? "").slice(0, 80)}".`, entry: { id: created.id, month: m } };
  },

  async update_tracker_entry(ctx, a) {
    const entry = await findTrackerEntry(ctx, a.id);
    const patch: Args = { updated_at: ctx.now.toISOString() };
    if (a.description !== undefined) patch.description = str(a.description, "description", 1000);
    if (a.progress !== undefined) patch.progress = oneOf(a.progress, TRACKER_PROGRESS, "progress");
    if (Object.keys(patch).length === 1) fail("Tidak ada perubahan yang valid.");
    await ctx.db.update("tracker_entries", `id=${eq(String(entry.id))}&member_id=${eq(String(entry.member_id))}`, patch);
    ctx.changed.add("tracker");
    return { ok: true, message: "Tracker diperbarui." };
  },

  async delete_tracker_entry(ctx, a) {
    const entry = await findTrackerEntry(ctx, a.id); // members: only their own
    const n = await ctx.db.remove("tracker_entries", `id=${eq(String(entry.id))}&member_id=${eq(String(entry.member_id))}`);
    if (!n) fail("Izin ditolak atau entri tidak ditemukan: kamu hanya boleh menghapus tracker milikmu sendiri.");
    ctx.changed.add("tracker");
    return { ok: true, message: "Entri tracker dihapus." };
  },
};

const WRITE_TOOLS = new Set(["create_proker", "update_proker", "delete_proker", "update_proker_details", "manage_proker_item", "add_tracker_entry", "update_tracker_entry", "delete_tracker_entry"]);

/** Runs a tool call. Never throws: errors come back as { error } for the model to relay. */
/**
 * Lenient tool-argument parsing: models sometimes wrap JSON in code fences, add text
 * around it, double-encode it, or use single quotes / trailing commas / True-False-None.
 * Returns null if nothing sensible can be recovered.
 */
export function parseArgs(raw: unknown): Args | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Args;
  if (raw === undefined || raw === null || (typeof raw === "string" && !raw.trim())) return {};
  let s = String(raw).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  const noTrailing = (t: string) => t.replace(/,\s*([}\]])/g, "$1");
  const pythonish = (t: string) => noTrailing(t.replace(/'/g, '"')).replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null");
  for (const attempt of [String(raw).trim(), s, noTrailing(s), pythonish(s)]) {
    try {
      let v = JSON.parse(attempt);
      if (typeof v === "string") v = JSON.parse(v); // double-encoded
      if (v && typeof v === "object" && !Array.isArray(v)) return v as Args;
    } catch {
      /* try the next repair */
    }
  }
  return null;
}

/**
 * Readable arguments that fit the tool's schema: only known keys, all required keys present.
 * The gateway can garble arguments into JSON that still parses (e.g. one junk key), so parsing
 * alone isn't enough.
 */
export function usableArgs(name: string, raw: unknown): Args | null {
  const args = parseArgs(raw);
  const def = TOOL_DEFS.find((d) => d.function.name === name);
  if (!args || !def) return args;
  const params = def.function.parameters as { properties?: Record<string, unknown>; required?: string[] };
  const known = Object.keys(params.properties ?? {});
  if (Object.keys(args).some((k) => !known.includes(k))) return null;
  if ((params.required ?? []).some((k) => args[k] === undefined)) return null;
  return args;
}

/** Drop keys the tool doesn't define (e.g. an injected member_id); handlers only read known keys anyway. */
function knownKeys(name: string, args: Args | null): Args | null {
  const def = TOOL_DEFS.find((d) => d.function.name === name);
  if (!args || !def) return args;
  const known = Object.keys((def.function.parameters as { properties?: Record<string, unknown> }).properties ?? {});
  const kept = Object.fromEntries(Object.entries(args).filter(([k]) => known.includes(k)));
  const required = (def.function.parameters as { required?: string[] }).required ?? [];
  return required.every((k) => kept[k] !== undefined) ? kept : null; // missing required = garbled
}

/** Example arguments shown to the model when its arguments can't be read. */
function exampleArgs(name: string): string {
  const def = TOOL_DEFS.find((d) => d.function.name === name);
  const params = (def?.function.parameters ?? {}) as { required?: string[] };
  const req = params.required ?? [];
  return JSON.stringify(Object.fromEntries(req.map((k) => [k, "..."])));
}

export async function runTool(ctx: ToolContext, name: string, rawArgs: unknown): Promise<Result> {
  ctx.toolCalls++;
  const handler = handlers[name];
  if (!handler) return { error: `Tool tidak dikenal: ${name}` };
  const args = knownKeys(name, parseArgs(rawArgs));
  if (!args) {
    const raw = typeof rawArgs === "string" ? rawArgs : JSON.stringify(rawArgs);
    console.log(`tool ${name}: unreadable arguments ${raw?.slice(0, 300)}`);
    ctx.badArgs = (ctx.badArgs ?? 0) + 1;
    if (WRITE_TOOLS.has(name)) await log(ctx, name, {}, "error", `Argumen tidak terbaca: ${String(raw).slice(0, 300)}`);
    return { error: `Argumen tool tidak valid. Kirim ulang argumen sebagai satu objek JSON, contoh: ${exampleArgs(name)}` };
  }
  try {
    const result = await handler(ctx, args);
    if (WRITE_TOOLS.has(name)) {
      const outcome = result.status === "requested" ? "requested" : "done";
      ctx.actions.push({ tool: name, outcome, label: String(result.message ?? "") });
      await log(ctx, name, args, outcome, String(result.message ?? ""));
    }
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const denied = e instanceof ToolError && msg.startsWith("Izin ditolak");
    const shown = e instanceof ToolError ? msg : "Terjadi kesalahan saat mengakses data.";
    if (WRITE_TOOLS.has(name)) {
      ctx.actions.push({ tool: name, outcome: denied ? "denied" : "error", label: shown });
      await log(ctx, name, args, denied ? "denied" : "error", msg);
    }
    return { error: shown };
  }
}

// ---------- schemas shown to the model ----------
const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): ToolDef => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
});
const divisionEnum = { type: "string", enum: [...DIVISIONS] };
const MEMBER_NAME = { type: "string", description: "Hanya untuk admin: nama anggota lain. Kosongkan untuk tracker sendiri." };

export const TOOL_DEFS: ToolDef[] = [
  fn("list_prokers", "Daftar proker PPI UPM, bisa difilter (divisi, status, zona, berkelanjutan, draft, nama).", {
    division: divisionEnum,
    status: { type: "string", enum: STATUSES },
    zone: { type: "string", enum: ZONES, description: "Zona proker aktif: red, medium, green." },
    berkelanjutan: { type: "boolean", description: "true = hanya proker berkelanjutan (ongoing)." },
    draft: { type: "boolean", description: "true = hanya draft (Lapak Kerja belum lengkap)." },
    search: { type: "string" },
  }),
  fn("get_proker", "Semua data satu proker: detail, zona, KPI, log progress, Lapak Kerja (link, tugas, timeline, juknis, catatan), RAB + total, komentar, sesi, dan hak akses pengguna untuk proker itu. Pakai ini sebelum mengubah data proker (untuk dapat id item).", { id: { type: "string" }, nama_proker: { type: "string", description: "Nama proker. Selalu isi bersama id (dipakai kalau id tidak cocok)." } }, ["id"]),
  fn(
    "update_proker_details",
    "Ubah detail proker: deskripsi, zona (merah/medium/hijau dan isinya), catatan, atau tandai selesai beserta laporan penyelesaian. Hanya setelah pengguna mengonfirmasi.",
    {
      id: { type: "string" },
      nama_proker: { type: "string", description: "Nama proker. Selalu isi bersama id (dipakai kalau id tidak cocok)." },
      changes: {
        type: "object",
        properties: {
          description: { type: "string" },
          current_zone: { type: "string", enum: ZONES, description: "Pindah zona: red, medium, green." },
          zone: {
            type: "object",
            description: "Isi zona yang sedang aktif (atau current_zone yang baru). Hanya kolom yang diubah.",
            properties: {
              current_status: { type: "string" },
              current_problem: { type: "string" },
              way_out: { type: "string" },
              action_needed: { type: "string" },
              deadline: { type: "string", description: "YYYY-MM-DD" },
            },
          },
          notes: { type: "string" },
          complete: { type: "boolean", description: "true = tandai proker selesai (progress 100%, zona dihapus)." },
          actual_peserta: { type: "integer" },
          success_factors: { type: "string" },
          improvements: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    ["id", "changes"]
  ),
  fn(
    "manage_proker_item",
    "Tambah, ubah, atau hapus data di dalam proker: Lapak Kerja, RAB, KPI, log progress, sesi, komentar, catatan. Untuk update/delete, ambil item_id dari get_proker. Hanya setelah pengguna mengonfirmasi.",
    {
      action: { type: "string", enum: ["add", "update", "delete"] },
      kind: { type: "string", enum: Object.keys(ITEM_KINDS), description: "Jenis data dan isi fields-nya: task (Pembagian Tugas: tugas, pic, link, deadline YYYY-MM-DD, done, notes); link (label, url); timeline (label, event_date, notes); juknis (waktu, durasi, keterangan, deskripsi, pengisi, penanggung_jawab, properti, notes); rab (kebutuhan, quantity, satuan, harga_satuan dalam angka); kpi (label, target, current, unit); progress_log (progress 0/25/50/75/100, log_date, note); session (Log Session proker berkelanjutan: entry_date, notes, plus kolom sesuai kategori, mis. finance: targeted_income, actual_income; people: attendees, meals_bought, meals_given_out, location; training: topic, speaker, target_audience, actual_audience; outreach: posts_count, total_reach, new_followers; response: messages_per_day, messages_replied_per_day, response_time_minutes); comment (komentar proker berkelanjutan: comment_text); rab_comment (komentar RAB, Bendahara/admin: comment_text, rab_id opsional); notes (Catatan Lapak Kerja: content; action add/update menyimpan, delete mengosongkan)." },
      id: { type: "string", description: "id proker" },
      nama_proker: { type: "string", description: "Nama proker. Selalu isi bersama id (dipakai kalau id tidak cocok)." },
      item_id: { type: "string", description: "id item (untuk update/delete)" },
      fields: { type: "object", description: "Isi item sesuai kind (lihat deskripsi kind). Untuk update, hanya kolom yang diubah." },
    },
    ["action", "kind", "id"]
  ),
  fn("list_members", "Cari anggota PPI UPM: nama, divisi, jabatan, fakultas, angkatan. Tidak ada nomor HP atau tanggal lahir.", {
    division: divisionEnum,
    position: { type: "string", enum: POSITIONS },
    search: { type: "string", description: "Sebagian nama" },
  }),
  fn("list_meetings", "Daftar rapat divisi (topik, jadwal, status, peserta, notulen).", { division: divisionEnum, status: { type: "string" } }),
  fn("read_guide", "Baca panduan dashboard (cara pakai fitur: membuat proker, Lapak Kerja, zona, Log Session, rating, evaluasi, tracker, dll). Pakai untuk pertanyaan 'bagaimana cara...'.", {
    topic: { type: "string", description: "Kata kunci dalam bahasa Inggris, mis. 'lapak kerja activation', 'zones', 'rating'." },
  }),
  fn(
    "create_proker",
    "Buat proker baru (otomatis draft). Hanya setelah pengguna mengonfirmasi.",
    {
      nama_proker: { type: "string" },
      division: divisionEnum,
      tanggal: { type: "string", description: "YYYY-MM-DD" },
      type: { type: "string", enum: TYPES },
      target_peserta: { type: "integer" },
      description: { type: "string" },
      collab_divisions: { type: "array", items: divisionEnum },
      is_berkelanjutan: { type: "boolean", description: "Proker berkelanjutan (program rutin/ongoing). false = proker sekali jalan." },
      berkelanjutan_category: { type: "string", enum: BERK_CATEGORIES, description: "Kategori tracker proker berkelanjutan: finance (Danus), response (Humas), outreach (konten), people (komunitas), training (seminar)." },
      berkelanjutan_notes: { type: "string" },
    },
    ["nama_proker", "division", "tanggal", "type"]
  ),
  fn(
    "update_proker",
    "Ubah proker. Hanya setelah pengguna mengonfirmasi.",
    {
      id: { type: "string" },
      nama_proker: { type: "string", description: "Nama proker saat ini. Selalu isi bersama id (dipakai kalau id tidak cocok)." },
      changes: {
        type: "object",
        properties: {
          nama_proker: { type: "string" },
          tanggal: { type: "string" },
          type: { type: "string", enum: TYPES },
          status: { type: "string", enum: STATUSES },
          progress: { type: "integer", enum: PROGRESS },
          target_peserta: { type: "integer" },
          description: { type: "string" },
          collab_divisions: { type: "array", items: divisionEnum },
          division: divisionEnum,
          is_berkelanjutan: { type: "boolean", description: "Proker berkelanjutan (program rutin/ongoing). false = proker sekali jalan." },
          berkelanjutan_category: { type: "string", enum: BERK_CATEGORIES, description: "Kategori tracker proker berkelanjutan: finance (Danus), response (Humas), outreach (konten), people (komunitas), training (seminar)." },
          berkelanjutan_notes: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    ["id", "changes"]
  ),
  fn("delete_proker", "Hapus proker (minggu pertama: jadi permintaan ke admin). Hanya setelah pengguna mengonfirmasi.", { id: { type: "string" }, nama_proker: { type: "string", description: "Nama proker. Selalu isi bersama id (dipakai kalau id tidak cocok)." }, reason: { type: "string" } }, ["id"]),
  fn("get_my_tracker", "Tracker bulanan milik pengguna (admin: bisa anggota lain lewat member_name).", { month: { type: "string", description: "YYYY-MM, default bulan ini" }, member_name: MEMBER_NAME }),
  fn("add_tracker_entry", "Tambah entri ke tracker bulanan pengguna sendiri (admin: bisa anggota lain lewat member_name).", { month: { type: "string" }, description: { type: "string" }, progress: { type: "string", enum: TRACKER_PROGRESS }, member_name: MEMBER_NAME }, ["description"]),
  fn("update_tracker_entry", "Ubah entri tracker milik pengguna sendiri.", { id: { type: "string" }, description: { type: "string" }, progress: { type: "string", enum: TRACKER_PROGRESS } }, ["id"]),
  fn("delete_tracker_entry", "Hapus entri tracker milik pengguna sendiri.", { id: { type: "string" } }, ["id"]),
];
