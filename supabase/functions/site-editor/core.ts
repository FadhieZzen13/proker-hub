// Public Website → Prokers for division editors (not the website-admin password).
//
// Members unlock with their own dashboard password (same session as the assistant, so
// one unlock covers both). Every save re-checks, on the server, that the proker belongs to
// a division this member may edit (access.ts). Writes use the service role.

import { signSession, verifyPassword, verifySession } from "../ppi-assistant/auth.ts";
import { eq, type Db } from "../ppi-assistant/db.ts";
import { signUpload, type Env as UploadEnv } from "../site-upload/core.ts";
import { siteEditableDivisions } from "./access.ts";

export interface Deps {
  db: Db;
  now: () => Date;
  sessionSecret: string;
  upload: UploadEnv;
  fetchImpl?: typeof fetch;
}

export interface Response {
  status: number;
  body: Record<string, unknown>;
}

interface MemberRow {
  id: string;
  name: string;
  division: string;
  position: string;
  password_hash?: string | null;
}

const SESSION_HOURS = 12;
const ok = (body: Record<string, unknown>): Response => ({ status: 200, body });
const err = (status: number, error: string): Response => ({ status, body: { error } });

const DETAIL_TEXT = { body: 8000, location: 200, linkLabel: 60 } as const;
const MAX_GALLERY = 30;

/**
 * Validate page details. Images must be files in our own `site-images` bucket (uploaded
 * through this page); the link button must be http(s). Unknown keys are dropped.
 */
export function cleanDetails(raw: unknown, supabaseUrl: string): Record<string, unknown> | string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "Data halaman tidak valid.";
  const d = raw as Record<string, unknown>;
  const imagePrefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/site-images/`;
  const isOurImage = (v: unknown) => typeof v === "string" && v.startsWith(imagePrefix) && !v.includes("..");
  const out: Record<string, unknown> = {};

  if (d.cover !== undefined && d.cover !== "") {
    if (!isOurImage(d.cover)) return "Foto sampul harus diunggah lewat halaman ini.";
    out.cover = d.cover;
  }
  if (d.gallery !== undefined) {
    if (!Array.isArray(d.gallery) || d.gallery.length > MAX_GALLERY) return `Galeri maksimal ${MAX_GALLERY} foto.`;
    const gallery = d.gallery.filter((g) => g !== "");
    if (!gallery.every(isOurImage)) return "Foto galeri harus diunggah lewat halaman ini.";
    if (gallery.length) out.gallery = gallery;
  }
  for (const key of Object.keys(DETAIL_TEXT) as (keyof typeof DETAIL_TEXT)[]) {
    const v = d[key];
    if (v === undefined || v === "") continue;
    if (typeof v !== "string") return "Data halaman tidak valid.";
    if (v.trim()) out[key] = v.trim().slice(0, DETAIL_TEXT[key]);
  }
  if (d.link !== undefined && d.link !== "") {
    if (typeof d.link !== "string" || !/^https?:\/\/[^\s]+$/i.test(d.link.trim())) return "Link harus diawali https://";
    out.link = d.link.trim().slice(0, 500);
  }
  return out;
}

export async function handle(input: Record<string, unknown>, deps: Deps): Promise<Response> {
  const { db, sessionSecret } = deps;
  const now = deps.now();
  const nowSec = Math.floor(now.getTime() / 1000);

  const loadMember = async (id: string) =>
    (await db.select<MemberRow>("members", `select=id,name,division,position,password_hash&id=${eq(id)}`))[0];

  if (input.action === "login") {
    const memberId = typeof input.memberId === "string" ? input.memberId : "";
    const password = typeof input.password === "string" ? input.password : "";
    const member = memberId ? await loadMember(memberId) : undefined;
    if (!member || !(await verifyPassword(password, member.password_hash))) return err(401, "Password salah.");
    const divisions = siteEditableDivisions(member);
    if (!divisions.length) return err(403, "Kamu belum punya akses untuk mengatur website.");
    const token = await signSession({ mid: member.id, exp: nowSec + SESSION_HOURS * 3600 }, sessionSecret);
    return ok({ token, divisions, name: member.name });
  }

  // Everything else needs a valid session and at least one editable division.
  const session = await verifySession(input.token as string, sessionSecret, nowSec);
  if (!session) return err(401, "Sesi berakhir. Masukkan password lagi.");
  const member = await loadMember(session.mid); // fresh: position/division may have changed
  const divisions = siteEditableDivisions(member);
  if (!member || !divisions.length) return err(403, "Kamu belum punya akses untuk mengatur website.");

  /** The proker, if this member may edit it. */
  const editableProker = async () => {
    const id = typeof input.prokerId === "string" ? input.prokerId : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [p] = await db.select<{ id: string; division: string }>("prokers", `select=id,division&id=${eq(id)}`);
    return p && divisions.includes(p.division) ? p : null;
  };

  /** Insert or update this proker's site_prokers row. */
  const save = async (prokerId: string, patch: Record<string, unknown>) => {
    const row = { ...patch, updated_at: now.toISOString() };
    const existing = await db.select("site_prokers", `select=proker_id&proker_id=${eq(prokerId)}`);
    if (existing.length) await db.update("site_prokers", `proker_id=${eq(prokerId)}`, row);
    else await db.insert("site_prokers", { proker_id: prokerId, ...row });
  };

  switch (input.action) {
    case "me":
      return ok({ divisions, name: member.name });

    case "set_proker": {
      const p = await editableProker();
      if (!p) return err(403, "Kamu tidak bisa mengubah proker ini.");
      const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
      await save(p.id, {
        published: input.published === true,
        public_title: text(input.title, 200),
        public_description: text(input.description, 1000),
      });
      return ok({ ok: true });
    }

    case "set_details": {
      const p = await editableProker();
      if (!p) return err(403, "Kamu tidak bisa mengubah proker ini.");
      const details = cleanDetails(input.details, deps.upload.supabaseUrl);
      if (typeof details === "string") return err(400, details);
      await save(p.id, { details });
      return ok({ ok: true });
    }

    case "upload": {
      // Proker page images only; the other folders stay admin-only (site-upload).
      const res = await signUpload("prokers", String(input.ext ?? ""), deps.upload, deps.fetchImpl);
      return { status: res.status, body: res.body };
    }

    default:
      return err(400, "Unknown action.");
  }
}
