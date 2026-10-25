// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, verifySession } from "../ppi-assistant/auth.ts";
import { createHash } from "node:crypto";
import { handle } from "./core.ts";

// made up per run, so there's no password literal for secret scanners to flag
const PW = `pw-${crypto.randomUUID()}`;
const OTHER_PW = `pw-${crypto.randomUUID()}`;
const NOW = new Date("2026-10-25T12:00:00Z");
const NOW_SEC = NOW.getTime() / 1000;

type Row = Record<string, any>;

// The format the old browser code (src/lib/password.ts) stored, computed independently.
const legacyHash = (pw: string) => createHash("sha256").update(`ppi-upm-2025/26${pw}`).digest("hex");

// Tiny in-memory PostgREST: understands eq. and is.null, ignores select.
function fakeDb(tables: Record<string, Row[]>) {
  const filters = (q: string) =>
    q.split("&").flatMap((part) => {
      const [k, v = ""] = part.split("=");
      if (k === "select") return [];
      if (v.startsWith("eq.")) return [(r: Row) => String(r[k]) === decodeURIComponent(v.slice(3))];
      if (v === "is.null") return [(r: Row) => r[k] == null];
      throw new Error(`fake db: unsupported filter ${part}`);
    });
  const match = (table: string, q: string) => (tables[table] ??= []).filter((r) => filters(q).every((f) => f(r)));
  let n = 0;
  return {
    select: async (t: string, q: string) => match(t, q),
    insert: async (t: string, row: Row) => {
      const full = { id: `new-${++n}`, position: "Staff", registered_at: NOW.toISOString(), ...row };
      (tables[t] ??= []).push(full);
      return full;
    },
    update: async (t: string, q: string, patch: Row) => {
      const rows = match(t, q);
      rows.forEach((r) => Object.assign(r, patch));
      return rows;
    },
  };
}

async function setup() {
  const tables: Record<string, Row[]> = {
    members: [
      // hashed the way the old browser code did it, to prove existing passwords still work
      { id: "m1", name: "Mikail", division: "BPH", password_hash: legacyHash(PW) },
      { id: "m2", name: "Kayla", division: "HUMAS", password_hash: null },
    ],
  };
  return { tables, deps: { db: fakeDb(tables) as any, now: () => NOW, sessionSecret: "s" } };
}

describe("member-auth", () => {
  it("hash format matches the old browser hashing", async () => {
    expect(await hashPassword(PW)).toBe(legacyHash(PW));
  });

  it("status says whether a password is set, never returns the hash", async () => {
    const { deps } = await setup();
    const a = await handle({ action: "status", memberId: "m1" }, deps);
    expect(a).toEqual({ status: 200, body: { hasPassword: true } });
    expect((await handle({ action: "status", memberId: "m2" }, deps)).body).toEqual({ hasPassword: false });
    expect((await handle({ action: "status", memberId: "nope" }, deps)).status).toBe(404);
  });

  it("login: right password gives a session for that member, wrong or missing gives 401", async () => {
    const { deps } = await setup();
    const r = await handle({ action: "login", memberId: "m1", password: PW }, deps);
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain("password_hash");
    expect((await verifySession(r.body.token as string, "s", NOW_SEC))?.mid).toBe("m1");

    expect((await handle({ action: "login", memberId: "m1", password: OTHER_PW }, deps)).status).toBe(401);
    expect((await handle({ action: "login", memberId: "m1" }, deps)).status).toBe(401);
    // a member with no password can't log in with an empty one
    expect((await handle({ action: "login", memberId: "m2", password: "" }, deps)).status).toBe(401);
    expect((await handle({ action: "login", memberId: "nope", password: PW }, deps)).status).toBe(401);
  });

  it("claim sets a first password once, then refuses to overwrite it", async () => {
    const { tables, deps } = await setup();
    const r = await handle({ action: "claim", memberId: "m2", password: PW }, deps);
    expect(r.status).toBe(200);
    expect((await verifySession(r.body.token as string, "s", NOW_SEC))?.mid).toBe("m2");
    expect(await verifyPassword(PW, tables.members[1].password_hash)).toBe(true);

    const again = await handle({ action: "claim", memberId: "m2", password: OTHER_PW }, deps);
    expect(again.status).toBe(409);
    expect(await verifyPassword(PW, tables.members[1].password_hash)).toBe(true);
  });

  it("claim can't overwrite an existing password (e.g. an admin's)", async () => {
    const { tables, deps } = await setup();
    const before = tables.members[0].password_hash;
    const r = await handle({ action: "claim", memberId: "m1", password: OTHER_PW }, deps);
    expect(r.status).toBe(409);
    expect(tables.members[0].password_hash).toBe(before);
  });

  it("claim rejects short passwords and unknown members", async () => {
    const { tables, deps } = await setup();
    expect((await handle({ action: "claim", memberId: "m2", password: "abc" }, deps)).status).toBe(400);
    expect(tables.members[1].password_hash).toBeNull();
    expect((await handle({ action: "claim", memberId: "nope", password: PW }, deps)).status).toBe(404);
  });

  it("register creates the member with a hashed password and returns no hash", async () => {
    const { tables, deps } = await setup();
    const member = { name: " Raka ", faculty: "Engineering", intake: 2025, phone: "60111", division: "AKSI", birthDate: "2004-01-02" };
    const r = await handle({ action: "register", member, password: PW }, deps);
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain("password_hash");
    expect(r.body.member).toMatchObject({ id: "new-1", name: "Raka", division: "AKSI", position: "Staff", birth_date: "2004-01-02" });
    expect((await verifySession(r.body.token as string, "s", NOW_SEC))?.mid).toBe("new-1");

    const row = tables.members.find((m) => m.id === "new-1")!;
    expect(await verifyPassword(PW, row.password_hash)).toBe(true);
    // login works straight away with the new password
    expect((await handle({ action: "login", memberId: "new-1", password: PW }, deps)).status).toBe(200);
  });

  it("register ignores fields the browser shouldn't set (position, hash, id)", async () => {
    const { tables, deps } = await setup();
    const member = { name: "X", faculty: "F", intake: 2025, phone: "1", division: "AKSI", position: "Kadep", password_hash: "x", id: "m1" };
    const r = await handle({ action: "register", member, password: PW }, deps);
    expect(r.status).toBe(200);
    const row = tables.members.at(-1)!;
    expect(row.id).toBe("new-1");
    expect(row.position).toBe("Staff");
    expect(await verifyPassword(PW, row.password_hash)).toBe(true);
  });

  it("register rejects missing details and short passwords", async () => {
    const { tables, deps } = await setup();
    const good = { name: "X", faculty: "F", intake: 2025, phone: "1", division: "AKSI" };
    expect((await handle({ action: "register", member: { ...good, name: "" }, password: PW }, deps)).status).toBe(400);
    expect((await handle({ action: "register", member: { ...good, intake: "abc" }, password: PW }, deps)).status).toBe(400);
    expect((await handle({ action: "register", member: good, password: "abc" }, deps)).status).toBe(400);
    expect(tables.members).toHaveLength(2);
  });

  it("unknown action is a 400", async () => {
    const { deps } = await setup();
    expect((await handle({ action: "set_hash" }, deps)).status).toBe(400);
  });
});
