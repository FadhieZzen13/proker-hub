// Materi library (public site /materi).
// Public:     submit (metadata + a link, or a file -> one-time signed upload URL), finish (file landed).
// Moderators: login, list, approve, reject. Moderators are admins (CHAT_ADMIN_MEMBER_IDS) and AKSI
//             members, checked server-side with the same member session as the assistant.
// Nothing is public until approved; rejecting deletes the file.
import { signSession, verifyPassword, verifySession } from "../ppi-assistant/auth.ts";
import { eq, type Db } from "../ppi-assistant/db.ts";

export const BUCKET = "materi";
export const CATEGORIES = ["Catatan Kuliah", "Soal Ujian", "Skripsi / Tesis", "Beasiswa", "Lainnya"];
export const MAX_BYTES = 20 * 1024 * 1024;
export const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const HOURLY_LIMIT = 30; // submissions per hour, all visitors together
const SESSION_HOURS = 12;

export interface Storage {
  /** One-time upload token for `path` in the materi bucket. */
  signUpload(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
}

export interface Deps {
  db: Db;
  storage: Storage;
  now: () => Date;
  sessionSecret: string;
  adminIds: string[];
}

export interface Response {
  status: number;
  body: Record<string, unknown>;
}

interface MemberRow {
  id: string;
  name: string;
  division: string;
  password_hash?: string | null;
}

interface MateriRow {
  id: string;
  title: string;
  faculty: string;
  course: string;
  category: string;
  uploader_name: string;
  intake: string;
  link_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
}

const ok = (body: Record<string, unknown>): Response => ({ status: 200, body });
const err = (status: number, error: string): Response => ({ status, body: { error } });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

export const canModerate = (m: Pick<MemberRow, "id" | "division">, adminIds: string[]) => adminIds.includes(m.id) || m.division === "AKSI";

/** Only http(s) links, so the site never renders javascript: or data: URLs. */
export function cleanLink(raw: unknown): string | null {
  const s = str(raw, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Keeps the name readable but safe as a storage key. */
export function safeFileName(name: string, ext: string): string {
  const stem = name.replace(/\.[^.]*$/, "").normalize("NFKD").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${stem || "materi"}.${ext}`;
}

export async function handle(input: Record<string, unknown>, deps: Deps): Promise<Response> {
  const { db, storage, sessionSecret, adminIds } = deps;
  const now = deps.now();
  const nowSec = Math.floor(now.getTime() / 1000);

  // ---------- public ----------
  if (input.action === "submit") {
    const meta = {
      title: str(input.title, 120),
      faculty: str(input.faculty, 80),
      course: str(input.course, 80),
      category: str(input.category, 40),
      uploader_name: str(input.uploaderName, 80),
      intake: str(input.intake, 10),
    };
    if (!meta.title) return err(400, "Judul wajib diisi.");
    if (!meta.uploader_name) return err(400, "Nama wajib diisi.");
    if (!CATEGORIES.includes(meta.category)) return err(400, "Pilih kategori.");

    const since = encodeURIComponent(new Date(now.getTime() - 3600_000).toISOString());
    if ((await db.count("materi", `created_at=gte.${since}`)) >= HOURLY_LIMIT) {
      return err(429, "Lagi banyak kiriman. Coba lagi sejam lagi.");
    }

    const file = input.file as { name?: unknown; size?: unknown } | undefined;
    if (!file) {
      const link = cleanLink(input.link);
      if (!link) return err(400, "Link harus diawali https://");
      await db.insert("materi", { ...meta, link_url: link, uploaded: true });
      return ok({ ok: true });
    }

    const name = str(file.name, 200);
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const size = Number(file.size);
    if (!TYPES[ext]) return err(400, "File harus PDF, DOC/DOCX, atau PPT/PPTX.");
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return err(400, "Ukuran file maksimal 20 MB.");

    const path = `${crypto.randomUUID()}/${safeFileName(name, ext)}`;
    const row = await db.insert<MateriRow>("materi", { ...meta, file_path: path, file_name: name, file_size: size, uploaded: false });
    const token = await storage.signUpload(path);
    return ok({ id: row.id, bucket: BUCKET, path, token, contentType: TYPES[ext] });
  }

  if (input.action === "finish") {
    const id = str(input.id, 64);
    const row = id ? (await db.select<MateriRow>("materi", `select=id,file_path,uploaded&id=${eq(id)}`))[0] : undefined;
    if (!row?.file_path) return err(404, "Kiriman tidak ditemukan.");
    if (!row.uploaded) {
      if (!(await storage.exists(row.file_path))) return err(400, "File belum ter-upload. Coba lagi.");
      await db.update("materi", `id=${eq(row.id)}`, { uploaded: true });
    }
    return ok({ ok: true });
  }

  // ---------- moderators ----------
  const loadMember = async (mid: string) =>
    mid ? (await db.select<MemberRow>("members", `select=id,name,division,password_hash&id=${eq(mid)}`))[0] : undefined;

  if (input.action === "login") {
    const member = await loadMember(str(input.memberId, 64));
    if (!member || !(await verifyPassword(String(input.password ?? ""), member.password_hash))) return err(401, "Password salah.");
    if (!canModerate(member, adminIds)) return err(403, "Khusus admin dan AKSI.");
    return ok({ token: await signSession({ mid: member.id, exp: nowSec + SESSION_HOURS * 3600 }, sessionSecret) });
  }

  // fresh member row every time: someone moved out of AKSI loses access right away
  const session = await verifySession(input.token as string, sessionSecret, nowSec);
  if (!session) return err(401, "Sesi berakhir. Masukkan password lagi.");
  const me = await loadMember(session.mid);
  if (!me || !canModerate(me, adminIds)) return err(403, "Khusus admin dan AKSI.");

  if (input.action === "list") {
    const rows = await db.select<MateriRow>(
      "materi",
      "select=id,title,faculty,course,category,uploader_name,intake,link_url,file_path,file_name,file_size,uploaded,status,created_at,reviewed_at&status=in.(pending,approved)&order=created_at.desc&limit=500"
    );
    // a file submission whose upload never finished isn't worth reviewing
    return ok({ items: rows.filter((r) => r.uploaded) });
  }

  if (input.action === "approve" || input.action === "reject") {
    const id = str(input.id, 64);
    const row = id ? (await db.select<MateriRow>("materi", `select=id,file_path,status&id=${eq(id)}`))[0] : undefined;
    if (!row || row.status === "rejected") return err(404, "Materi tidak ditemukan.");
    if (input.action === "reject" && row.file_path) await storage.remove(row.file_path);
    await db.update("materi", `id=${eq(row.id)}`, {
      status: input.action === "approve" ? "approved" : "rejected",
      reviewed_at: now.toISOString(),
      reviewed_by: me.id,
    });
    return ok({ ok: true });
  }

  return err(400, "Unknown action.");
}

/** Storage over the REST API with the service-role key. */
export function restStorage(supabaseUrl: string, serviceKey: string, fetchImpl: typeof fetch = fetch): Storage {
  const base = supabaseUrl.replace(/\/$/, "");
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const key = (path: string) => path.split("/").map(encodeURIComponent).join("/");
  return {
    async signUpload(path) {
      const res = await fetchImpl(`${base}/storage/v1/object/upload/sign/${BUCKET}/${key(path)}`, { method: "POST", headers, body: "{}" });
      if (!res.ok) throw new Error(`storage sign: ${res.status} ${(await res.text()).slice(0, 200)}`);
      const { url } = (await res.json()) as { url?: string };
      const token = url ? new URL(url, base).searchParams.get("token") : null;
      if (!token) throw new Error("storage sign: no token");
      return token;
    },
    async exists(path) {
      const res = await fetchImpl(`${base}/storage/v1/object/info/${BUCKET}/${key(path)}`, { headers });
      return res.ok;
    },
    async remove(path) {
      const res = await fetchImpl(`${base}/storage/v1/object/${BUCKET}`, { method: "DELETE", headers, body: JSON.stringify({ prefixes: [path] }) });
      if (!res.ok) throw new Error(`storage remove: ${res.status} ${(await res.text()).slice(0, 200)}`);
    },
  };
}
