// HUMAS Inbox (humas-bot FR-29/FR-30): read-only view of the WhatsApp bot's conversations.
// The humas_* tables hold the public's numbers and messages and are private (service role only),
// so the dashboard reads them through here, after a member password check, and only HUMAS
// members and admins get in.
import { signSession, verifyPassword, verifySession } from "../ppi-assistant/auth.ts";
import { eq, type Db } from "../ppi-assistant/db.ts";

export interface Deps {
  db: Db;
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
  position: string;
  password_hash?: string | null;
}

type Row = Record<string, unknown>;

const SESSION_HOURS = 12;
const WINDOW_DAYS = 30; // matches the bot's message retention
const ok = (body: Record<string, unknown>): Response => ({ status: 200, body });
const err = (status: number, error: string): Response => ({ status, body: { error } });

export const canReadInbox = (m: Pick<MemberRow, "id" | "division">, adminIds: string[]) => adminIds.includes(m.id) || m.division === "HUMAS";

export async function handle(input: Record<string, unknown>, deps: Deps): Promise<Response> {
  const { db, sessionSecret, adminIds } = deps;
  const now = deps.now();
  const nowSec = Math.floor(now.getTime() / 1000);
  const since = encodeURIComponent(new Date(now.getTime() - WINDOW_DAYS * 86400_000).toISOString());
  const loadMember = async (id: string) =>
    (await db.select<MemberRow>("members", `select=id,name,division,position,password_hash&id=${eq(id)}`))[0];

  if (input.action === "login") {
    const memberId = typeof input.memberId === "string" ? input.memberId : "";
    const member = memberId ? await loadMember(memberId) : undefined;
    if (!member || !(await verifyPassword(String(input.password ?? ""), member.password_hash))) return err(401, "Password salah.");
    if (!canReadInbox(member, adminIds)) return err(403, "Inbox HUMAS hanya untuk anggota HUMAS.");
    const token = await signSession({ mid: member.id, exp: nowSec + SESSION_HOURS * 3600 }, sessionSecret);
    return ok({ token });
  }

  // fresh member row every time: someone moved out of HUMAS loses access right away
  const session = await verifySession(input.token as string, sessionSecret, nowSec);
  if (!session) return err(401, "Sesi berakhir. Masukkan password lagi.");
  const member = await loadMember(session.mid);
  if (!member || !canReadInbox(member, adminIds)) return err(403, "Inbox HUMAS hanya untuk anggota HUMAS.");

  if (input.action === "chats") {
    const [contacts, recent, handoffs] = await Promise.all([
      db.select<Row>("humas_contacts", `select=jid,phone,name,mode,last_category,first_seen_at,last_activity_at&last_activity_at=gte.${since}&order=last_activity_at.desc&limit=300`),
      db.select<Row>("humas_messages", `select=jid,body,direction,created_at&created_at=gte.${since}&order=created_at.desc&limit=1000`),
      db.select<Row>("humas_handoffs", `select=jid,requested_at,first_admin_reply_at,closed_at&requested_at=gte.${since}&order=requested_at.desc&limit=1000`),
    ]);
    const lastMsg = new Map<string, Row>();
    const count = new Map<string, number>();
    for (const m of recent) {
      const jid = String(m.jid);
      if (!lastMsg.has(jid)) lastMsg.set(jid, m);
      if (m.direction === "in") count.set(jid, (count.get(jid) ?? 0) + 1);
    }
    const latestHandoff = new Map<string, Row>();
    for (const h of handoffs) if (!latestHandoff.has(String(h.jid))) latestHandoff.set(String(h.jid), h);

    const chats = contacts.map((c) => {
      const jid = String(c.jid);
      const h = latestHandoff.get(jid);
      const last = lastMsg.get(jid);
      return {
        jid,
        name: c.name ?? null,
        phone: c.phone ?? null,
        mode: c.mode,
        lastCategory: c.last_category ?? null,
        lastActivityAt: c.last_activity_at,
        lastMessage: last ? { body: String(last.body).slice(0, 160), direction: last.direction, at: last.created_at } : null,
        messagesIn: count.get(jid) ?? 0,
        handoff: h ? { requestedAt: h.requested_at, answered: !!h.first_admin_reply_at, open: !h.closed_at } : null,
      };
    });
    return ok({ chats });
  }

  if (input.action === "messages") {
    const jid = typeof input.jid === "string" ? input.jid : "";
    if (!/^[0-9]+@(s\.whatsapp\.net|lid)$/.test(jid)) return err(400, "Chat tidak valid.");
    const messages = await db.select<Row>("humas_messages", `select=body,direction,category,off_hours,backlog,created_at&jid=${eq(jid)}&created_at=gte.${since}&order=created_at.asc&limit=1000`);
    return ok({ messages });
  }

  return err(400, "Unknown action.");
}
