import { signSession, verifyPassword, verifySession } from "./auth.ts";
import { eq, type Db } from "./db.ts";
import type { ChatMessage, Llm } from "./llm.ts";
import type { Member } from "./permissions.ts";
import { GATE_PROMPT, OFF_TOPIC_REPLY, systemPrompt } from "./prompts.ts";
import { parseArgs, runTool, TOOL_DEFS, type ToolContext } from "./tools.ts";

export interface Config {
  sessionSecret: string;
  launchDate: string | null; // go-live day (YYYY-MM-DD; YYYY-M-D accepted); deletes need admin approval for 7 days after it
  hourlyLimit: number;
  adminIds?: string[]; // member ids with admin privileges (CHAT_ADMIN_MEMBER_IDS)
}

/** "2026-10-8" -> "2026-10-08". null when missing or not a real date. */
export function normalizeDate(raw: string | null | undefined): string | null {
  const m = raw?.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

export interface Deps {
  db: Db;
  llm: Llm;
  /** Optional cheaper/faster model for the topic gate (CHAT_GATE_MODEL); defaults to `llm`. */
  gateLlm?: Llm;
  now: () => Date;
  config: Config;
}

export interface Response {
  status: number;
  body: Record<string, unknown>;
}

const SESSION_HOURS = 12;
const MAX_HISTORY = 12;
const MAX_TOOL_ROUNDS = 6;

// A reply that says something was saved/changed (Indonesian or English).
const CLAIMS_CHANGE = /(sudah|udah|telah|berhasil)\b[^.!?\n]{0,40}?(tambah|isi|buat|bikin|simpan|catat|ubah|update|perbarui|hapus|kirim)|\b(added|saved|created|updated|deleted)\b/i;
// Tool-call syntax that leaked into the text instead of a real tool call.
const LEAKED_TOOL_CALL = /<\|tool_call|functions\.[a-z_]+|"name"\s*:\s*"(create_proker|update_proker|delete_proker|add_tracker_entry|update_tracker_entry|delete_tracker_entry)"/;
const NUDGE =
  "(Pesan otomatis dari sistem, bukan dari pengguna.) Di permintaan ini kamu belum memanggil tool apa pun, jadi BELUM ADA data yang tersimpan atau berubah. Kalau pengguna sudah setuju, panggil tool yang sesuai sekarang lewat function calling. Kalau belum, minta konfirmasi dulu. Jangan bilang sudah tersimpan kalau tool belum dipanggil.";
// Internal names that must never reach the user (field/tool names, raw booleans, UUIDs).
const FIELD_LABELS: Record<string, string> = {
  is_berkelanjutan: "Proker Berkelanjutan",
  berkelanjutan_category: "kategori tracker",
  berkelanjutan_notes: "catatan berkelanjutan",
  nama_proker: "nama proker",
  target_peserta: "target peserta",
  collab_divisions: "divisi kolaborasi",
  lapak_ready: "Lapak Kerja",
};
const TOOL_NAMES = "list_prokers|get_proker|create_proker|update_proker|delete_proker|get_my_tracker|add_tracker_entry|update_tracker_entry|delete_tracker_entry";
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const TECH_LEAK = new RegExp(`\\b(${Object.keys(FIELD_LABELS).join("|")}|${TOOL_NAMES})\\b|:\\s*\`?(true|false|null)\\b|${UUID.source}`, "i");
const STYLE_NUDGE =
  "(Pesan otomatis dari sistem, bukan dari pengguna.) Jawabanmu barusan memakai istilah teknis (nama kolom/tool, true/false, atau id). Tulis ulang jawaban yang sama untuk pengguna dengan bahasa sehari-hari dan istilah dashboard saja, tanpa istilah teknis dan tanpa id. Jangan memanggil tool.";

/** Last resort: swap leftover internal names for dashboard words and drop ids. */
export function scrubTechTerms(text: string): string {
  return text
    .replace(/`?\bis_berkelanjutan\b`?\s*[:=]\s*`?true`?/gi, "Proker Berkelanjutan dinyalakan")
    .replace(/`?\bis_berkelanjutan\b`?\s*[:=]\s*`?false`?/gi, "Proker Berkelanjutan dimatikan")
    .replace(new RegExp(`\`?\\b(${Object.keys(FIELD_LABELS).join("|")})\\b\`?`, "gi"), (_m, k: string) => FIELD_LABELS[k.toLowerCase()])
    .replace(new RegExp(`\`?\\b(${TOOL_NAMES})\\b\`?`, "gi"), "")
    .replace(/\s*\(?\s*(ID:?\s*)?`?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`?\s*\)?/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const NOT_SAVED_REPLY = "Maaf, perubahannya **belum tersimpan**. Coba kirim ulang permintaannya ya.";
const TOOL_FORMAT_REPLY =
  "Maaf, aku gagal menjalankan perintahnya (format perintah dari model tidak terbaca), jadi **belum ada yang tersimpan**. Coba kirim ulang ya.";
const ok = (body: Record<string, unknown>): Response => ({ status: 200, body });
const err = (status: number, error: string): Response => ({ status, body: { error } });

/** Re-ask for one tool call's arguments as plain-text JSON (no function calling). null if still unreadable. */
async function repairArgs(llm: Llm, conversation: ChatMessage[], tool: string, garbled: string): Promise<Record<string, unknown> | null> {
  const def = TOOL_DEFS.find((d) => d.function.name === tool);
  if (!def) return null;
  try {
    const reply = await llm(
      [
        ...conversation,
        {
          role: "user",
          content:
            `(Pesan otomatis dari sistem, bukan dari pengguna.) Argumen untuk tool \`${tool}\` rusak saat dikirim: ${garbled.slice(0, 500)}\n` +
            `Tulis ulang argumennya sebagai SATU objek JSON yang valid sesuai skema ini, tanpa teks lain dan tanpa memanggil tool:\n` +
            JSON.stringify(def.function.parameters),
        },
      ],
      { temperature: 0, maxTokens: 2048 }
    );
    const args = parseArgs(reply.content ?? "");
    return args && Object.keys(args).length ? args : null;
  } catch (e) {
    console.log(`tool ${tool}: repair error ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Deletes need admin approval until 7 days after launch. No launch date set = always (safe default). */
export function deleteNeedsApproval(config: Config, now: Date): boolean {
  const day = normalizeDate(config.launchDate);
  if (!day) return true;
  const launch = Date.parse(`${day}T00:00:00+08:00`); // Malaysia time
  if (isNaN(launch)) return true;
  return now.getTime() < launch + 7 * 24 * 3600 * 1000;
}

async function loadMember(db: Db, id: string, withHash = false) {
  const rows = await db.select<Member & { password_hash?: string | null }>(
    "members",
    `select=id,name,division,position${withHash ? ",password_hash" : ""}&id=${eq(id)}`
  );
  return rows[0] ?? null;
}

/** Keep only plain user/assistant text from the client, trimmed. Clients can't inject system/tool messages. */
function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })) as ChatMessage[];
}

async function isOnTopic(llm: Llm, history: ChatMessage[]): Promise<boolean> {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const prevAssistant = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const reply = await llm(
    [
      { role: "system", content: GATE_PROMPT },
      { role: "user", content: `Previous assistant message (context): ${String(prevAssistant).slice(0, 600) || "(none)"}\n\nUser message to classify: ${lastUser}` },
    ],
    { temperature: 0, maxTokens: 1024 } // room for a thinking model's reasoning before the JSON
  );
  const verdict = parseGate(reply.content) ?? parseGate(reply.reasoning);
  console.log(
    `gate: ${verdict === null ? "unparseable -> blocked" : verdict ? "allowed" : "blocked"} finish=${reply.finishReason ?? "?"} content=${JSON.stringify((reply.content ?? "").slice(0, 120))}`
  );
  return verdict === true; // unparseable -> blocked
}

/** Last {"allowed": true|false} in the text (tolerates code fences / extra words). null if none. */
export function parseGate(text: string | null | undefined): boolean | null {
  if (!text) return null;
  const all = [...text.matchAll(/\{\s*"allowed"\s*:\s*(true|false)\s*\}/g)];
  return all.length ? all[all.length - 1][1] === "true" : null;
}

export async function handle(input: Record<string, unknown>, deps: Deps): Promise<Response> {
  const { db, llm, config } = deps;
  const now = deps.now();
  const nowSec = Math.floor(now.getTime() / 1000);

  switch (input.action) {
    // ---- member sign-in for the assistant ----
    case "login": {
      const memberId = typeof input.memberId === "string" ? input.memberId : "";
      const password = typeof input.password === "string" ? input.password : "";
      const member = memberId ? await loadMember(db, memberId, true) : null;
      if (!member || !(await verifyPassword(password, member.password_hash))) return err(401, "Password salah.");
      const token = await signSession({ mid: member.id, exp: nowSec + SESSION_HOURS * 3600 }, config.sessionSecret);
      return ok({ token, member: { id: member.id, name: member.name, division: member.division, position: member.position } });
    }

    // ---- chat ----
    case "chat": {
      const session = await verifySession(input.token as string, config.sessionSecret, nowSec);
      if (!session) return err(401, "Sesi berakhir. Masukkan password lagi.");
      const member = await loadMember(db, session.mid); // fresh: position/division may have changed
      if (!member) return err(401, "Akun tidak ditemukan.");
      member.isAdmin = (config.adminIds ?? []).includes(member.id);

      const history = sanitizeHistory(input.messages);
      if (!history.length || history[history.length - 1].role !== "user") return err(400, "Pesan kosong.");

      // Admins: no hourly limit, no topic filter.
      if (!member.isAdmin) {
        const since = new Date(now.getTime() - 3600_000).toISOString();
        const used = await db.count("ai_usage", `member_id=${eq(member.id)}&created_at=gte.${encodeURIComponent(since)}`);
        if (used >= config.hourlyLimit) return ok({ reply: "Kamu sudah mencapai batas pesan per jam. Coba lagi nanti ya.", limited: true });
      }
      const allowed = member.isAdmin || (await isOnTopic(deps.gateLlm ?? llm, history));
      await db.insert("ai_usage", { member_id: member.id, blocked: !allowed });
      if (!allowed) return ok({ reply: OFF_TOPIC_REPLY, blocked: true });

      // Admins' deletes happen directly (still logged); everyone else waits for approval in week one.
      const needsApproval = !member.isAdmin && deleteNeedsApproval(config, now);
      const ctx: ToolContext = { db, member, now, deleteNeedsApproval: needsApproval, changed: new Set(), toolCalls: 0, actions: [] };
      const done = (reply: string) => ok({ reply, changed: [...ctx.changed], actions: ctx.actions });
      let nudged = false;
      let restyled = false;
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt(member, { today: now.toISOString().slice(0, 10), deleteNeedsApproval: needsApproval }) },
        ...history,
      ];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const reply = await llm(messages, { tools: TOOL_DEFS });
        if (!reply.tool_calls?.length) {
          const text = reply.content?.trim() ?? "";
          // The model claims a change (or leaked tool syntax) but made no tool call at all: don't trust it.
          const suspicious = ctx.toolCalls === 0 && (CLAIMS_CHANGE.test(text) || LEAKED_TOOL_CALL.test(text));
          console.log(`chat: round=${round} tools=${ctx.toolCalls} finish=${reply.finishReason ?? "?"} suspicious=${suspicious}`);
          if (suspicious && !nudged) {
            nudged = true;
            messages.push({ role: "assistant", content: text }, { role: "user", content: NUDGE });
            continue;
          }
          if (suspicious) return done(NOT_SAVED_REPLY);
          // Every write failed but the reply sounds like success: don't let it contradict the receipts.
          const allFailed = ctx.actions.length > 0 && ctx.actions.every((x) => x.outcome === "error" || x.outcome === "denied");
          if (allFailed && CLAIMS_CHANGE.test(text)) return done(`Maaf, **belum berhasil**: ${ctx.actions[ctx.actions.length - 1].label}`);
          // Field names / true-false / ids in the reply: ask for a plain-language rewrite once, then scrub.
          if (TECH_LEAK.test(text)) {
            if (!restyled) {
              restyled = true;
              messages.push({ role: "assistant", content: text }, { role: "user", content: STYLE_NUDGE });
              continue;
            }
            return done(scrubTechTerms(text) || "Maaf, aku belum bisa menjawab itu.");
          }
          return done(text || "Maaf, aku belum bisa menjawab itu.");
        }
        console.log(`chat: round=${round} tool_calls=${reply.tool_calls.map((c) => c.function.name).join(",")}`);
        // The gateway sometimes garbles native tool-call arguments (quotes/colons dropped), while plain
        // text comes through intact. Ask for the arguments again as text, and keep the repaired version in
        // the history so the model doesn't copy the garbled one on the next round.
        for (const call of reply.tool_calls) {
          if (parseArgs(call.function.arguments)) continue;
          const fixed = await repairArgs(llm, messages, call.function.name, call.function.arguments);
          console.log(`tool ${call.function.name}: repair ${fixed ? "ok" : "failed"}`);
          if (fixed) call.function.arguments = JSON.stringify(fixed);
        }
        // Thinking models expect their reasoning back alongside the tool calls.
        messages.push({ role: "assistant", content: reply.content, tool_calls: reply.tool_calls, ...(reply.reasoning ? { reasoning_content: reply.reasoning } : {}) });
        const badBefore = ctx.badArgs ?? 0;
        for (const call of reply.tool_calls) {
          const result = await runTool(ctx, call.function.name, call.function.arguments);
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
        }
        // Every call this round had unreadable arguments, and it's not the first time: stop retrying.
        if ((ctx.badArgs ?? 0) - badBefore === reply.tool_calls.length && (ctx.badArgs ?? 0) >= 2) return done(TOOL_FORMAT_REPLY);
      }
      return done(
        ctx.actions.length
          ? "Sebagian sudah dikerjakan (lihat tanda di bawah), tapi permintaannya terlalu banyak langkah. Lanjutkan dengan pesan berikutnya ya."
          : "Maaf, aku belum berhasil menyelesaikan ini dan **belum ada yang tersimpan**. Coba kirim ulang dengan permintaan yang lebih spesifik."
      );
    }

    // ---- admin: delete-request monitor + activity log ----
    case "admin_list":
    case "admin_decide": {
      const secret = typeof input.adminSecret === "string" ? input.adminSecret : "";
      const isAdmin = secret ? await db.rpc<boolean>("site_admin_ok", { secret }) : false;
      if (!isAdmin) return err(401, "Password admin salah.");

      if (input.action === "admin_list") {
        const [requests, actions] = await Promise.all([
          db.select("ai_delete_requests", "select=*&order=created_at.desc&limit=100"),
          db.select("ai_action_log", "select=*&order=created_at.desc&limit=100"),
        ]);
        return ok({ requests, actions, deleteNeedsApproval: deleteNeedsApproval(config, now), launchDate: normalizeDate(config.launchDate) });
      }

      const requestId = typeof input.requestId === "string" ? input.requestId : "";
      const decision = input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : null;
      if (!requestId || !decision) return err(400, "Permintaan tidak valid.");
      const [req] = await db.select<{ id: string; proker_id: string; status: string; proker_snapshot: Record<string, unknown> }>(
        "ai_delete_requests",
        `select=*&id=${eq(requestId)}`
      );
      if (!req) return err(404, "Permintaan tidak ditemukan.");
      if (req.status !== "pending") return err(409, "Permintaan ini sudah diputuskan.");
      if (decision === "approved") await db.remove("prokers", `id=${eq(req.proker_id)}`);
      await db.update("ai_delete_requests", `id=${eq(req.id)}`, { status: decision, decided_at: now.toISOString() });
      await db.insert("ai_action_log", {
        member_id: null,
        member_name: "Admin",
        tool: decision === "approved" ? "approve_delete" : "reject_delete",
        args: { request_id: req.id, proker_id: req.proker_id },
        outcome: "done",
        detail: `${decision === "approved" ? "Menyetujui" : "Menolak"} hapus "${req.proker_snapshot?.nama_proker ?? req.proker_id}"`,
      });
      return ok({ ok: true, status: decision });
    }

    default:
      return err(400, "Unknown action.");
  }
}
