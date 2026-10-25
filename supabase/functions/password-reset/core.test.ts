// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, signSession } from "../ppi-assistant/auth.ts";
import { handle, sha256 } from "./core.ts";

// made up per run, so there's no password literal for secret scanners to flag
const OLD_PW = `pw-${crypto.randomUUID()}`;
const NEW_PW = `pw-${crypto.randomUUID()}`;
const NOW = new Date("2026-10-25T12:00:00Z");
const ADMIN = "admin-1";

type Row = Record<string, any>;

// Tiny in-memory PostgREST: understands eq., in.(…) and ignores select/order/limit/gte.
function fakeDb(tables: Record<string, Row[]>) {
  const filters = (q: string) =>
    q.split("&").flatMap((part) => {
      const [k, v = ""] = part.split("=");
      if (["select", "order", "limit"].includes(k) || v.startsWith("gte.")) return [];
      if (v.startsWith("eq.")) return [(r: Row) => String(r[k]) === decodeURIComponent(v.slice(3))];
      if (v.startsWith("in.(")) {
        const set = v.slice(4, -1).split(",").map(decodeURIComponent);
        return [(r: Row) => set.includes(String(r[k]))];
      }
      throw new Error(`fake db: unsupported filter ${part}`);
    });
  const match = (table: string, q: string) => (tables[table] ??= []).filter((r) => filters(q).every((f) => f(r)));
  let n = 0;
  return {
    select: async (t: string, q: string) => match(t, q),
    insert: async (t: string, row: Row) => {
      const full = { id: `r${++n}`, status: "pending", token_hash: null, token_expires_at: null, created_at: NOW.toISOString(), contact: null, note: null, ...row };
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
      { id: "m1", name: "Mikail", division: "BPH", phone: "60123", password_hash: await hashPassword(OLD_PW) },
      { id: ADMIN, name: "Fadhie", division: "BPH", phone: null, password_hash: await hashPassword(OLD_PW) },
    ],
    password_reset_requests: [],
  };
  let i = 0;
  const deps = { db: fakeDb(tables) as any, now: () => NOW, sessionSecret: "s", adminIds: [ADMIN], randomToken: () => `tok-${++i}-${"x".repeat(30)}` };
  const adminToken = await signSession({ mid: ADMIN, exp: NOW.getTime() / 1000 + 3600 }, "s");
  return { tables, deps, adminToken };
}

describe("password-reset", () => {
  it("full flow: request -> admin link -> reset sets the new password, link works once", async () => {
    const { tables, deps, adminToken } = await setup();
    expect((await handle({ action: "request", memberId: "m1", contact: "+60 12-3", note: "lupa" }, deps)).status).toBe(200);

    const list = await handle({ action: "list", token: adminToken }, deps);
    const req = (list.body.requests as Row[])[0];
    expect(req).toMatchObject({ name: "Mikail", status: "pending", contact: "+60 12-3", note: "lupa" });

    const link = await handle({ action: "create_link", token: adminToken, requestId: req.id }, deps);
    const token = link.body.token as string;
    expect(tables.password_reset_requests[0].token_hash).toBe(await sha256(token)); // never the raw token

    expect((await handle({ action: "check", token }, deps)).body).toEqual({ name: "Mikail" });
    expect((await handle({ action: "reset", token, password: "ab" }, deps)).status).toBe(400);
    expect((await handle({ action: "reset", token, password: NEW_PW }, deps)).status).toBe(200);
    expect(await verifyPassword(NEW_PW, tables.members[0].password_hash)).toBe(true);
    expect((await handle({ action: "reset", token, password: OLD_PW }, deps)).status).toBe(410);
  });

  it("admin can make a link for a member who never asked", async () => {
    const { deps, adminToken } = await setup();
    const link = await handle({ action: "create_link", token: adminToken, memberId: "m1" }, deps);
    expect(link.status).toBe(200);
    expect((await handle({ action: "check", token: link.body.token }, deps)).status).toBe(200);
  });

  it("asking twice keeps one open request", async () => {
    const { tables, deps } = await setup();
    await handle({ action: "request", memberId: "m1" }, deps);
    await handle({ action: "request", memberId: "m1", note: "again" }, deps);
    expect(tables.password_reset_requests).toHaveLength(1);
    expect(tables.password_reset_requests[0].note).toBe("again");
  });

  it("expired, dismissed, or made-up links don't work", async () => {
    const { deps, adminToken } = await setup();
    const a = await handle({ action: "create_link", token: adminToken, memberId: "m1" }, deps);
    const later = { ...deps, now: () => new Date(NOW.getTime() + 49 * 3600_000) };
    expect((await handle({ action: "reset", token: a.body.token, password: NEW_PW }, later)).status).toBe(410);

    const b = await handle({ action: "create_link", token: adminToken, memberId: "m1" }, deps);
    for (const r of (await handle({ action: "list", token: adminToken }, deps)).body.requests as Row[]) {
      await handle({ action: "dismiss", token: adminToken, requestId: r.id }, deps);
    }
    expect((await handle({ action: "check", token: b.body.token }, deps)).status).toBe(410);
    expect((await handle({ action: "check", token: "made-up-token-that-is-long-enough" }, deps)).status).toBe(410);
  });

  it("admin actions need an admin session", async () => {
    const { deps } = await setup();
    const memberToken = await signSession({ mid: "m1", exp: NOW.getTime() / 1000 + 3600 }, "s");
    expect((await handle({ action: "list", token: memberToken }, deps)).status).toBe(403);
    expect((await handle({ action: "create_link", token: "forged.token", memberId: "m1" }, deps)).status).toBe(401);
    expect((await handle({ action: "login", memberId: "m1", password: OLD_PW }, deps)).status).toBe(403);
    expect((await handle({ action: "login", memberId: ADMIN, password: OLD_PW }, deps)).status).toBe(200);
  });
});
