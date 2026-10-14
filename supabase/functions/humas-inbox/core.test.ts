// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword, signSession } from "../ppi-assistant/auth.ts";
import { handle } from "./core.ts";

// made up per run, so there's no password literal for secret scanners to flag
const TEST_PW = `pw-${crypto.randomUUID()}`;

const NOW = new Date("2026-10-14T12:00:00Z");
const ADMIN = "admin-1";

async function setup() {
  const pw = await hashPassword(TEST_PW);
  const members = [
    { id: "h1", name: "Staf HUMAS", division: "HUMAS", position: "Staff", password_hash: pw },
    { id: "s1", name: "Staf SEBURA", division: "SEBURA", position: "Staff", password_hash: pw },
    { id: ADMIN, name: "Fadhie", division: "BPH", position: "Staff", password_hash: pw },
  ];
  const contacts = [
    { jid: "601@s.whatsapp.net", phone: "601", name: "Ani", mode: "human", last_category: 3, last_activity_at: "2026-10-14T11:00:00Z" },
    { jid: "999@lid", phone: null, name: null, mode: "bot", last_category: null, last_activity_at: "2026-10-14T10:00:00Z" },
  ];
  // newest first, like the query asks for
  const messages = [
    { jid: "601@s.whatsapp.net", body: "Oke kak, admin akan membalas", direction: "bot", created_at: "2026-10-14T11:00:00Z" },
    { jid: "601@s.whatsapp.net", body: "8", direction: "in", created_at: "2026-10-14T10:59:00Z" },
    { jid: "601@s.whatsapp.net", body: "3", direction: "in", created_at: "2026-10-14T10:58:00Z" },
    { jid: "999@lid", body: "halo", direction: "in", created_at: "2026-10-14T10:00:00Z" },
  ];
  const handoffs = [{ jid: "601@s.whatsapp.net", requested_at: "2026-10-14T10:59:00Z", first_admin_reply_at: null, closed_at: null }];
  const queries: string[] = [];
  const db: any = {
    select: async (table: string, q: string) => {
      queries.push(`${table}?${q}`);
      const id = decodeURIComponent(q.match(/(?:^|&)(?:id|jid)=eq\.([^&]+)/)?.[1] ?? "");
      if (table === "members") return members.filter((m) => m.id === id);
      if (table === "humas_contacts") return contacts;
      if (table === "humas_handoffs") return handoffs;
      if (table === "humas_messages") return id ? [...messages].reverse().filter((m) => m.jid === id) : messages;
      return [];
    },
  };
  const deps = { db, now: () => NOW, sessionSecret: "s", adminIds: [ADMIN] };
  const tokenFor = (mid: string) => signSession({ mid, exp: NOW.getTime() / 1000 + 3600 }, "s");
  return { deps, queries, tokenFor };
}

describe("humas-inbox access (FR-30)", () => {
  it("lets HUMAS members and admins log in, refuses others and wrong passwords", async () => {
    const { deps } = await setup();
    expect((await handle({ action: "login", memberId: "h1", password: TEST_PW }, deps)).status).toBe(200);
    expect((await handle({ action: "login", memberId: ADMIN, password: TEST_PW }, deps)).status).toBe(200);
    expect((await handle({ action: "login", memberId: "s1", password: TEST_PW }, deps)).status).toBe(403);
    expect((await handle({ action: "login", memberId: "h1", password: `${TEST_PW}-x` }, deps)).status).toBe(401);
  });

  it("re-checks the division on every request, even with a valid session (e.g. an assistant token)", async () => {
    const { deps, tokenFor } = await setup();
    expect((await handle({ action: "chats", token: await tokenFor("s1") }, deps)).status).toBe(403);
    expect((await handle({ action: "chats", token: "forged.token" }, deps)).status).toBe(401);
  });
});

describe("humas-inbox data (FR-29)", () => {
  it("lists chats with last message, incoming count and handoff state", async () => {
    const { deps, tokenFor } = await setup();
    const r = await handle({ action: "chats", token: await tokenFor("h1") }, deps);
    const [ani, hidden] = r.body.chats as any[];
    expect(ani).toMatchObject({ name: "Ani", phone: "601", mode: "human", messagesIn: 2, handoff: { answered: false, open: true } });
    expect(ani.lastMessage).toMatchObject({ direction: "bot", body: "Oke kak, admin akan membalas" });
    expect(hidden).toMatchObject({ phone: null, handoff: null, messagesIn: 1 });
  });

  it("returns one chat's messages oldest first, and only within 30 days", async () => {
    const { deps, queries, tokenFor } = await setup();
    const r = await handle({ action: "messages", token: await tokenFor(ADMIN), jid: "601@s.whatsapp.net" }, deps);
    expect((r.body.messages as any[]).map((m) => m.body)).toEqual(["3", "8", "Oke kak, admin akan membalas"]);
    expect(queries.at(-1)).toContain(`created_at=gte.${encodeURIComponent("2026-09-14T12:00:00.000Z")}`);
  });

  it("rejects malformed chat ids", async () => {
    const { deps, tokenFor } = await setup();
    expect((await handle({ action: "messages", token: await tokenFor("h1"), jid: "x&select=*" }, deps)).status).toBe(400);
  });
});
