// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword, signSession } from "../ppi-assistant/auth.ts";
import { cleanLink, handle, safeFileName } from "./core.ts";

// made up per run, so there's no password literal for secret scanners to flag
const TEST_PW = `pw-${crypto.randomUUID()}`;
const NOW = new Date("2026-10-26T12:00:00Z");
const ADMIN = "admin-1";

type Row = Record<string, any>;

// Tiny in-memory PostgREST: eq., in.(…); select/order/limit/gte. ignored.
function fakeDb(tables: Record<string, Row[]>) {
  const filters = (q: string) =>
    q.split("&").flatMap((part) => {
      const [k, v = ""] = part.split("=");
      if (["select", "order", "limit"].includes(k) || v.startsWith("gte.")) return [];
      if (v.startsWith("eq.")) return [(r: Row) => String(r[k]) === decodeURIComponent(v.slice(3))];
      if (v.startsWith("in.(")) {
        const set = v.slice(4, -1).split(",");
        return [(r: Row) => set.includes(String(r[k]))];
      }
      throw new Error(`fake db: unsupported filter ${part}`);
    });
  const match = (t: string, q: string) => (tables[t] ??= []).filter((r) => filters(q).every((f) => f(r)));
  let n = 0;
  return {
    select: async (t: string, q: string) => match(t, q),
    count: async (t: string, q: string) => match(t, q).length,
    insert: async (t: string, row: Row) => {
      const full = { id: `m${++n}`, status: "pending", created_at: NOW.toISOString(), link_url: null, file_path: null, ...row };
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
  const pw = await hashPassword(TEST_PW);
  const tables: Record<string, Row[]> = {
    members: [
      { id: ADMIN, name: "Fadhie", division: "BPH", password_hash: pw },
      { id: "a1", name: "Staf AKSI", division: "AKSI", password_hash: pw },
      { id: "s1", name: "Staf SEBURA", division: "SEBURA", password_hash: pw },
    ],
    materi: [],
  };
  const files = new Set<string>();
  const removed: string[] = [];
  const storage = {
    signUpload: async (path: string) => `token-for-${path}`,
    exists: async (path: string) => files.has(path),
    remove: async (path: string) => {
      removed.push(path);
      files.delete(path);
    },
  };
  const deps = { db: fakeDb(tables) as any, storage, now: () => NOW, sessionSecret: "s", adminIds: [ADMIN] };
  const tokenFor = (mid: string) => signSession({ mid, exp: NOW.getTime() / 1000 + 3600 }, "s");
  return { tables, files, removed, deps, tokenFor };
}

const META = { title: "Rangkuman Kalkulus", faculty: "Engineering", course: "MTK3001", category: "Catatan Kuliah", uploaderName: "Ani", intake: "2022" };

describe("materi submit", () => {
  it("a link submission waits for review", async () => {
    const { tables, deps } = await setup();
    expect((await handle({ action: "submit", ...META, link: "https://drive.google.com/x" }, deps)).status).toBe(200);
    expect(tables.materi[0]).toMatchObject({ status: "pending", uploaded: true, link_url: "https://drive.google.com/x", uploader_name: "Ani" });
  });

  it("a file submission gets a signed upload, then only counts once the file is really there", async () => {
    const { tables, files, deps } = await setup();
    const r = await handle({ action: "submit", ...META, file: { name: "Kalkulus Bab 1.pdf", size: 1000 } }, deps);
    expect(r.status).toBe(200);
    const path = r.body.path as string;
    expect(path).toMatch(/^[0-9a-f-]{36}\/Kalkulus-Bab-1\.pdf$/);
    expect(r.body.token).toBe(`token-for-${path}`);
    expect(tables.materi[0].uploaded).toBe(false);

    expect((await handle({ action: "finish", id: r.body.id }, deps)).status).toBe(400);
    files.add(path);
    expect((await handle({ action: "finish", id: r.body.id }, deps)).status).toBe(200);
    expect(tables.materi[0].uploaded).toBe(true);
  });

  it("rejects bad input", async () => {
    const { deps } = await setup();
    const bad = async (extra: Row) => (await handle({ action: "submit", ...META, ...extra }, deps)).status;
    expect(await bad({ title: "" , link: "https://x.y" })).toBe(400);
    expect(await bad({ category: "Meme", link: "https://x.y" })).toBe(400);
    expect(await bad({ link: "javascript:alert(1)" })).toBe(400);
    expect(await bad({ file: { name: "virus.exe", size: 10 } })).toBe(400);
    expect(await bad({ file: { name: "big.pdf", size: 21 * 1024 * 1024 } })).toBe(400);
  });

  it("stops after the hourly limit", async () => {
    const { deps } = await setup();
    for (let i = 0; i < 30; i++) await handle({ action: "submit", ...META, link: "https://x.y" }, deps);
    expect((await handle({ action: "submit", ...META, link: "https://x.y" }, deps)).status).toBe(429);
  });
});

describe("materi moderation", () => {
  it("admins and AKSI can log in, others can't", async () => {
    const { deps } = await setup();
    expect((await handle({ action: "login", memberId: ADMIN, password: TEST_PW }, deps)).status).toBe(200);
    expect((await handle({ action: "login", memberId: "a1", password: TEST_PW }, deps)).status).toBe(200);
    expect((await handle({ action: "login", memberId: "s1", password: TEST_PW }, deps)).status).toBe(403);
    expect((await handle({ action: "list", token: await tokenFor0(deps, "s1") }, deps)).status).toBe(403);
  });

  it("lists finished submissions, approve publishes, reject deletes the file", async () => {
    const { tables, files, removed, deps, tokenFor } = await setup();
    const token = await tokenFor("a1");
    await handle({ action: "submit", ...META, link: "https://x.y" }, deps);
    const f = await handle({ action: "submit", ...META, file: { name: "a.pdf", size: 10 } }, deps);
    await handle({ action: "submit", ...META, file: { name: "never-uploaded.pdf", size: 10 } }, deps);
    files.add(f.body.path as string);
    await handle({ action: "finish", id: f.body.id }, deps);

    const items = (await handle({ action: "list", token }, deps)).body.items as Row[];
    expect(items.map((i) => i.id)).toEqual(["m1", "m2"]);

    await handle({ action: "approve", token, id: "m1" }, deps);
    await handle({ action: "reject", token, id: "m2" }, deps);
    expect(tables.materi[0]).toMatchObject({ status: "approved", reviewed_by: "a1" });
    expect(tables.materi[1].status).toBe("rejected");
    expect(removed).toEqual([f.body.path]);
  });
});

describe("helpers", () => {
  it("cleanLink only allows http(s)", () => {
    expect(cleanLink("https://drive.google.com/a")).toBe("https://drive.google.com/a");
    expect(cleanLink("data:text/html,hi")).toBeNull();
    expect(cleanLink("not a url")).toBeNull();
  });
  it("safeFileName keeps it readable and safe", () => {
    expect(safeFileName("../../Soal UTS (2024).PDF", "pdf")).toBe("Soal-UTS-2024.pdf");
    expect(safeFileName("???.pdf", "pdf")).toBe("materi.pdf");
  });
});

// session for a member, signed with the deps' secret
function tokenFor0(deps: { sessionSecret: string }, mid: string) {
  return signSession({ mid, exp: NOW.getTime() / 1000 + 3600 }, deps.sessionSecret);
}
