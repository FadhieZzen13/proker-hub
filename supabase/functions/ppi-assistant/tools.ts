import { eq, type Db } from "./db.ts";
import type { ToolDef } from "./llm.ts";
import { canManageProker, canWriteProkers, DIVISIONS, isBPH, type Member } from "./permissions.ts";

const TYPES = ["Internal", "External"];
const STATUSES = ["active", "complete"];
const PROGRESS = [0, 25, 50, 75, 100];
const TRACKER_PROGRESS = ["Not Started", "On Progress", "On Going", "Negotiation", "Cancelled", "Done"];
const PROKER_FIELDS = "id,nama_proker,division,collab_divisions,tanggal,type,status,progress,target_peserta,description,lapak_ready";

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

async function findProker(ctx: ToolContext, id: unknown) {
  const rows = await ctx.db.select<Result>("prokers", `select=${PROKER_FIELDS}&id=${eq(str(id, "id", 64))}`);
  if (!rows.length) fail("Proker tidak ditemukan.");
  return rows[0];
}

function requireManage(ctx: ToolContext, division: string) {
  if (!canWriteProkers(ctx.member)) fail("Izin ditolak: hanya BPH, Kadep, dan Wakadep yang boleh mengubah proker.");
  if (!canManageProker(ctx.member, division)) fail(`Izin ditolak: kamu hanya boleh mengelola proker divisi ${ctx.member.division}.`);
}

// ---------- tool implementations ----------
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
    return { proker: await findProker(ctx, a.id) };
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
    };
    const created = await ctx.db.insert<Result>("prokers", row);
    ctx.changed.add("prokers");
    return { ok: true, message: `Proker "${row.nama_proker}" dibuat (draft, ${division}, ${row.tanggal}).`, proker: { id: created.id, nama_proker: created.nama_proker, division, tanggal: row.tanggal } };
  },

  async update_proker(ctx, a) {
    const current = await findProker(ctx, a.id);
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
    const current = await findProker(ctx, a.id);
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
    const m = month(a.month, ctx.now);
    const rows = await ctx.db.select<Result>(
      "tracker_entries",
      `select=id,month,description,progress,sort&member_id=${eq(ctx.member.id)}&month=${eq(m)}&order=sort.asc,created_at.asc`
    );
    return { month: m, entries: rows };
  },

  async add_tracker_entry(ctx, a) {
    const m = month(a.month, ctx.now);
    const existing = await ctx.db.select<Result>("tracker_entries", `select=sort&member_id=${eq(ctx.member.id)}&month=${eq(m)}&order=sort.desc&limit=1`);
    const created = await ctx.db.insert<Result>("tracker_entries", {
      member_id: ctx.member.id, // always the signed-in member; never taken from the model
      division: ctx.member.division,
      month: m,
      description: str(a.description, "description", 1000),
      progress: a.progress === undefined ? "On Progress" : oneOf(a.progress, TRACKER_PROGRESS, "progress"),
      sort: Number(existing[0]?.sort ?? -1) + 1,
    });
    ctx.changed.add("tracker");
    return { ok: true, message: `Tracker ${m} ditambahkan: "${String(created.description ?? "").slice(0, 80)}".`, entry: { id: created.id, month: m } };
  },

  async update_tracker_entry(ctx, a) {
    const rows = await ctx.db.select<Result>("tracker_entries", `select=id,member_id&id=${eq(str(a.id, "id", 64))}`);
    if (!rows.length || rows[0].member_id !== ctx.member.id) fail("Izin ditolak: kamu hanya boleh mengubah tracker milikmu sendiri.");
    const patch: Args = { updated_at: ctx.now.toISOString() };
    if (a.description !== undefined) patch.description = str(a.description, "description", 1000);
    if (a.progress !== undefined) patch.progress = oneOf(a.progress, TRACKER_PROGRESS, "progress");
    if (Object.keys(patch).length === 1) fail("Tidak ada perubahan yang valid.");
    await ctx.db.update("tracker_entries", `id=${eq(String(rows[0].id))}&member_id=${eq(ctx.member.id)}`, patch);
    ctx.changed.add("tracker");
    return { ok: true, message: "Tracker diperbarui." };
  },

  async delete_tracker_entry(ctx, a) {
    const n = await ctx.db.remove("tracker_entries", `id=${eq(str(a.id, "id", 64))}&member_id=${eq(ctx.member.id)}`);
    if (!n) fail("Izin ditolak atau entri tidak ditemukan: kamu hanya boleh menghapus tracker milikmu sendiri.");
    ctx.changed.add("tracker");
    return { ok: true, message: "Entri tracker dihapus." };
  },
};

const WRITE_TOOLS = new Set(["create_proker", "update_proker", "delete_proker", "add_tracker_entry", "update_tracker_entry", "delete_tracker_entry"]);

/** Runs a tool call. Never throws: errors come back as { error } for the model to relay. */
export async function runTool(ctx: ToolContext, name: string, rawArgs: string): Promise<Result> {
  ctx.toolCalls++;
  const handler = handlers[name];
  if (!handler) return { error: `Tool tidak dikenal: ${name}` };
  let args: Args;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { error: "Argumen tool tidak valid." };
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

export const TOOL_DEFS: ToolDef[] = [
  fn("list_prokers", "Daftar proker PPI UPM, bisa difilter.", { division: divisionEnum, status: { type: "string", enum: STATUSES }, search: { type: "string" } }),
  fn("get_proker", "Detail satu proker.", { id: { type: "string" } }, ["id"]),
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
    },
    ["nama_proker", "division", "tanggal", "type"]
  ),
  fn(
    "update_proker",
    "Ubah proker. Hanya setelah pengguna mengonfirmasi.",
    {
      id: { type: "string" },
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
        },
        additionalProperties: false,
      },
    },
    ["id", "changes"]
  ),
  fn("delete_proker", "Hapus proker (minggu pertama: jadi permintaan ke admin). Hanya setelah pengguna mengonfirmasi.", { id: { type: "string" }, reason: { type: "string" } }, ["id"]),
  fn("get_my_tracker", "Tracker bulanan milik pengguna.", { month: { type: "string", description: "YYYY-MM, default bulan ini" } }),
  fn("add_tracker_entry", "Tambah entri ke tracker bulanan pengguna sendiri.", { month: { type: "string" }, description: { type: "string" }, progress: { type: "string", enum: TRACKER_PROGRESS } }, ["description"]),
  fn("update_tracker_entry", "Ubah entri tracker milik pengguna sendiri.", { id: { type: "string" }, description: { type: "string" }, progress: { type: "string", enum: TRACKER_PROGRESS } }, ["id"]),
  fn("delete_tracker_entry", "Hapus entri tracker milik pengguna sendiri.", { id: { type: "string" } }, ["id"]),
];
