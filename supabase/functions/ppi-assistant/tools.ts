import { eq, type Db } from "./db.ts";
import type { ToolDef } from "./llm.ts";
import { canManageProker, canWriteProkers, DIVISIONS, isBPH, type Member } from "./permissions.ts";

const TYPES = ["Internal", "External"];
const STATUSES = ["active", "complete"];
const PROGRESS = [0, 25, 50, 75, 100];
// Proker berkelanjutan tracker categories (dashboard CATEGORY_LABELS). "custom" needs custom
// parameters, which only the dashboard form can define, so the assistant can't pick it.
const BERK_CATEGORIES = ["finance", "response", "outreach", "people", "training"];
const TRACKER_PROGRESS = ["Not Started", "On Progress", "On Going", "Negotiation", "Cancelled", "Done"];
const PROKER_FIELDS = "id,nama_proker,division,collab_divisions,tanggal,type,status,progress,target_peserta,description,lapak_ready,is_berkelanjutan,berkelanjutan_category,berkelanjutan_notes";

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

const handlers: Record<string, (ctx: ToolContext, a: Args) => Promise<Result>> = {
  async list_prokers(ctx, a) {
    const q = [`select=${PROKER_FIELDS}`, "order=tanggal.asc", "limit=60"];
    if (a.division) q.push(`division=${eq(oneOf(a.division, [...DIVISIONS], "division"))}`);
    if (a.status) q.push(`status=${eq(oneOf(a.status, STATUSES, "status"))}`);
    let rows = await ctx.db.select<Result>("prokers", q.join("&"));
    const s = optStr(a.search, 100)?.toLowerCase();
    if (s) rows = rows.filter((r) => String(r.nama_proker ?? "").toLowerCase().includes(s));
    return { count: rows.length, prokers: rows.map((r) => ({ ...r, draft: r.lapak_ready === false, lapak_ready: undefined })) };
  },

  async get_proker(ctx, a) {
    return { proker: await findProker(ctx, a.id, a.nama_proker) };
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

const WRITE_TOOLS = new Set(["create_proker", "update_proker", "delete_proker", "add_tracker_entry", "update_tracker_entry", "delete_tracker_entry"]);

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
  fn("list_prokers", "Daftar proker PPI UPM, bisa difilter.", { division: divisionEnum, status: { type: "string", enum: STATUSES }, search: { type: "string" } }),
  fn("get_proker", "Detail satu proker.", { id: { type: "string" }, nama_proker: { type: "string", description: "Nama proker. Selalu isi bersama id (dipakai kalau id tidak cocok)." } }, ["id"]),
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
