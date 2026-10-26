// Admin-approved password reset.
// Public:  request (from the login screen), check + reset (from the one-time link).
// Admin:   login, list, create_link, dismiss. Admins are CHAT_ADMIN_MEMBER_IDS, checked
//          server-side with the same member session as the assistant and HUMAS Inbox.
// The link token is 32 random bytes; only its SHA-256 is stored, it expires, and it works once.
import { hashPassword, signSession, verifyPassword, verifySession } from "../ppi-assistant/auth.ts";
import { eq, type Db } from "../ppi-assistant/db.ts";

export interface Deps {
  db: Db;
  now: () => Date;
  sessionSecret: string;
  adminIds: string[];
  randomToken?: () => string;
}

export interface Response {
  status: number;
  body: Record<string, unknown>;
}

interface MemberRow {
  id: string;
  name: string;
  division: string;
  phone?: string | null;
  password_hash?: string | null;
}

interface RequestRow {
  id: string;
  member_id: string;
  contact: string | null;
  note: string | null;
  status: "pending" | "link_sent" | "done" | "dismissed";
  token_expires_at: string | null;
  created_at: string;
}

const SESSION_HOURS = 12;
const LINK_HOURS = 48;
const LIST_DAYS = 30;
const MIN_PASSWORD = 4; // same as the login screen
const ok = (body: Record<string, unknown>): Response => ({ status: 200, body });
const err = (status: number, error: string): Response => ({ status, body: { error } });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const enc = new TextEncoder();
export async function sha256(s: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function defaultToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function handle(input: Record<string, unknown>, deps: Deps): Promise<Response> {
  const { db, sessionSecret, adminIds } = deps;
  const now = deps.now();
  const nowSec = Math.floor(now.getTime() / 1000);
  const loadMember = async (id: string) =>
    id ? (await db.select<MemberRow>("members", `select=id,name,division,phone,password_hash&id=${eq(id)}`))[0] : undefined;

  // A live link: right hash, link_sent, not expired.
  const findLink = async (token: unknown) => {
    if (typeof token !== "string" || token.length < 20 || token.length > 100) return undefined;
    const row = (await db.select<RequestRow>("password_reset_requests", `select=id,member_id,status,token_expires_at&token_hash=${eq(await sha256(token))}`))[0];
    if (!row || row.status !== "link_sent" || !row.token_expires_at || new Date(row.token_expires_at) <= now) return undefined;
    return row;
  };

  // ---------- public ----------
  if (input.action === "request") {
    const member = await loadMember(str(input.memberId, 64));
    if (!member) return err(404, "Member not found.");
    // one open request per member is enough; asking again just refreshes the note
    const open = (await db.select<RequestRow>("password_reset_requests", `select=id&member_id=${eq(member.id)}&status=eq.pending`))[0];
    const fields = { contact: str(input.contact, 40) || null, note: str(input.note, 300) || null };
    if (open) await db.update("password_reset_requests", `id=${eq(open.id)}`, { ...fields, created_at: now.toISOString() });
    else await db.insert("password_reset_requests", { member_id: member.id, ...fields });
    return ok({ ok: true });
  }

  if (input.action === "check") {
    const link = await findLink(input.token);
    if (!link) return err(410, "This link is invalid or has expired. Ask the admin for a new one.");
    const member = await loadMember(link.member_id);
    return ok({ name: member?.name ?? "" });
  }

  if (input.action === "reset") {
    const link = await findLink(input.token);
    if (!link) return err(410, "This link is invalid or has expired. Ask the admin for a new one.");
    const password = typeof input.password === "string" ? input.password : "";
    if (password.length < MIN_PASSWORD) return err(400, `Password must be at least ${MIN_PASSWORD} characters.`);
    // burn the link first, so a double submit can't use it twice
    const burned = await db.update<RequestRow>("password_reset_requests", `id=${eq(link.id)}&status=eq.link_sent`, {
      status: "done",
      token_hash: null,
      resolved_at: now.toISOString(),
    });
    if (burned.length === 0) return err(410, "This link has already been used.");
    await db.update("members", `id=${eq(link.member_id)}`, { password_hash: await hashPassword(password) });
    return ok({ ok: true });
  }

  // ---------- admin ----------
  if (input.action === "login") {
    const member = await loadMember(str(input.memberId, 64));
    if (!member || !(await verifyPassword(String(input.password ?? ""), member.password_hash))) return err(401, "Wrong password.");
    if (!adminIds.includes(member.id)) return err(403, "Admins only.");
    return ok({ token: await signSession({ mid: member.id, exp: nowSec + SESSION_HOURS * 3600 }, sessionSecret) });
  }

  const session = await verifySession(input.token as string, sessionSecret, nowSec);
  if (!session) return err(401, "Session expired. Enter your password again.");
  if (!adminIds.includes(session.mid)) return err(403, "Admins only.");

  if (input.action === "list") {
    const since = encodeURIComponent(new Date(now.getTime() - LIST_DAYS * 86400_000).toISOString());
    const rows = await db.select<RequestRow>(
      "password_reset_requests",
      `select=id,member_id,contact,note,status,token_expires_at,created_at&created_at=gte.${since}&order=created_at.desc&limit=200`
    );
    const ids = [...new Set(rows.map((r) => r.member_id))];
    const members = ids.length
      ? await db.select<MemberRow>("members", `select=id,name,division,phone&id=in.(${ids.map(encodeURIComponent).join(",")})`)
      : [];
    const byId = new Map(members.map((m) => [m.id, m]));
    return ok({
      requests: rows.map((r) => {
        const m = byId.get(r.member_id);
        const expired = r.status === "link_sent" && !!r.token_expires_at && new Date(r.token_expires_at) <= now;
        return {
          id: r.id,
          memberId: r.member_id,
          name: m?.name ?? "(deleted member)",
          division: m?.division ?? "",
          phone: m?.phone ?? null,
          contact: r.contact,
          note: r.note,
          status: expired ? "expired" : r.status,
          expiresAt: r.token_expires_at,
          createdAt: r.created_at,
        };
      }),
    });
  }

  // From a request (requestId), or straight for a member who never asked (memberId).
  if (input.action === "create_link") {
    let id = str(input.requestId, 64);
    if (!id) {
      const member = await loadMember(str(input.memberId, 64));
      if (!member) return err(404, "Member not found.");
      id = (await db.insert<RequestRow>("password_reset_requests", { member_id: member.id, note: "Created by admin" })).id;
    }
    const token = (deps.randomToken ?? defaultToken)();
    const expiresAt = new Date(now.getTime() + LINK_HOURS * 3600_000).toISOString();
    const rows = await db.update<RequestRow>("password_reset_requests", `id=${eq(id)}&status=in.(pending,link_sent)`, {
      status: "link_sent",
      token_hash: await sha256(token),
      token_expires_at: expiresAt,
    });
    if (rows.length === 0) return err(404, "Request not found or already closed.");
    return ok({ token, expiresAt, requestId: id });
  }

  if (input.action === "dismiss") {
    const rows = await db.update("password_reset_requests", `id=${eq(str(input.requestId, 64))}&status=in.(pending,link_sent)`, {
      status: "dismissed",
      token_hash: null,
      resolved_at: now.toISOString(),
    });
    if (rows.length === 0) return err(404, "Request not found or already closed.");
    return ok({ ok: true });
  }

  return err(400, "Unknown action.");
}
