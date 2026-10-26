// Member login for the PPI dashboard. The browser never sees members.password_hash:
//   status   — does this member have a password yet?
//   login    — check the password, hand back a member session token
//   claim    — set a first password, only while password_hash is still null
//   register — create a new member with a password
// Sessions are the same signed tokens as ppi-assistant / HUMAS Inbox / password-reset,
// and the hash is the same salted SHA-256, so existing passwords keep working.
import { hashPassword, signSession, verifyPassword } from "../ppi-assistant/auth.ts";
import { eq, type Db } from "../ppi-assistant/db.ts";

export interface Deps {
  db: Db;
  now: () => Date;
  sessionSecret: string;
}

export interface Response {
  status: number;
  body: Record<string, unknown>;
}

interface MemberRow {
  id: string;
  password_hash?: string | null;
}

const SESSION_HOURS = 12;
const MIN_PASSWORD = 4; // same as the login screen
// what the browser may see of a member (everything but the hash)
const PUBLIC_COLUMNS = "id,name,faculty,intake,phone,division,position,birth_date,registered_at";
const ok = (body: Record<string, unknown>): Response => ({ status: 200, body });
const err = (status: number, error: string): Response => ({ status, body: { error } });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function handle(input: Record<string, unknown>, deps: Deps): Promise<Response> {
  const { db, sessionSecret } = deps;
  const nowSec = Math.floor(deps.now().getTime() / 1000);
  const session = async (mid: string) => signSession({ mid, exp: nowSec + SESSION_HOURS * 3600 }, sessionSecret);
  const password = typeof input.password === "string" ? input.password : "";
  const loadMember = async (id: string) =>
    id ? (await db.select<MemberRow>("members", `select=id,password_hash&id=${eq(id)}`))[0] : undefined;

  if (input.action === "status") {
    const member = await loadMember(str(input.memberId, 64));
    if (!member) return err(404, "Member not found.");
    return ok({ hasPassword: !!member.password_hash });
  }

  if (input.action === "login") {
    const member = await loadMember(str(input.memberId, 64));
    if (!member || !(await verifyPassword(password, member.password_hash))) return err(401, "Incorrect password");
    return ok({ token: await session(member.id) });
  }

  if (input.action === "claim") {
    if (password.length < MIN_PASSWORD) return err(400, `Password must be at least ${MIN_PASSWORD} characters`);
    const id = str(input.memberId, 64);
    if (!id) return err(404, "Member not found.");
    // the is.null filter makes this a no-op once anyone has set a password
    const rows = await db.update<MemberRow>("members", `id=${eq(id)}&password_hash=is.null`, { password_hash: await hashPassword(password) });
    if (rows.length === 0) {
      return (await loadMember(id)) ? err(409, "This account already has a password.") : err(404, "Member not found.");
    }
    return ok({ token: await session(id) });
  }

  if (input.action === "register") {
    if (password.length < MIN_PASSWORD) return err(400, `Password must be at least ${MIN_PASSWORD} characters`);
    const m = (input.member ?? {}) as Record<string, unknown>;
    const intake = Number(m.intake);
    const row = {
      name: str(m.name, 120),
      faculty: str(m.faculty, 120),
      intake,
      phone: str(m.phone, 40),
      division: str(m.division, 20),
      birth_date: str(m.birthDate, 10) || null,
    };
    if (!row.name || !row.faculty || !row.phone || !row.division || !Number.isInteger(intake)) return err(400, "Missing member details.");
    // position is left to the column default; only an admin edit changes it
    const created = await db.insert<Record<string, unknown>>("members", { ...row, password_hash: await hashPassword(password) });
    const member = Object.fromEntries(PUBLIC_COLUMNS.split(",").map((k) => [k, created[k] ?? null]));
    return ok({ member, token: await session(String(created.id)) });
  }

  return err(400, "Unknown action.");
}
