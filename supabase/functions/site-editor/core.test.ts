// @vitest-environment node
import { it, expect } from "vitest";
import { cleanDetails, handle } from "./core.ts";
import { siteEditableDivisions, SITE_EDITORS } from "./access.ts";
import { hashPassword } from "../ppi-assistant/auth.ts";
import * as dashboard from "../../../src/lib/siteAccess.ts";

const URL_ = "https://proj.supabase.co";
const IMG = `${URL_}/storage/v1/object/public/site-images/prokers/1.jpg`;

const M = {
  fadhie: { id: "0974c7ac-a1b6-4a01-9016-6b56fc573d05", name: "Fadhie Zen", division: "BPH", position: "Staff" },
  mikail: { id: "bbddad25-bc01-4f95-bd9e-9eae7d796cc1", name: "Mikail", division: "BPH", position: "Staff" },
  sidqin: { id: "10009df6-1f6a-4b79-bf7d-8b3fe7fedb62", name: "Sidqin Sukma Maarij", division: "BPH", position: "Staff" },
  harist: { id: "66ef0541-79bd-42ff-9b3c-752856a9b7aa", name: "Harist Mahri", division: "BPH", position: "Staff" },
  indira: { id: "80c30996-e859-4dfb-bab6-dcccce1e1f77", name: "Indira", division: "BPH", position: "Staff" },
  kayla: { id: "bbe62459-e2c6-46b7-9b59-a28edde2da09", name: "Kayla Almadhanti", division: "BPH", position: "Secretary" },
  kadepAksi: { id: "58e8f9c2-4fda-44ef-a5dd-9860faf3d804", name: "Haryo", division: "AKSI", position: "Kadep" },
  wakadepRomas: { id: "82ea4b33-8eab-407b-abf3-bd4f4f858477", name: "Sumayyah", division: "ROMAS", position: "Wakadep" },
  staffAksi: { id: "aaaaaaaa-0000-0000-0000-000000000001", name: "Staf", division: "AKSI", position: "Staff" },
};

it("gives each person exactly the divisions agreed", () => {
  const ALL = ["BPH", "AKSI", "POSDM", "ROMAS", "HUMAS", "DANUS", "SEBURA", "MEDIFO"];
  expect(siteEditableDivisions(M.fadhie)).toEqual(ALL);
  expect(siteEditableDivisions(M.mikail)).toEqual(ALL);
  expect(siteEditableDivisions(M.sidqin)).toEqual(["SEBURA", "MEDIFO"]);
  expect(siteEditableDivisions(M.harist)).toEqual(["HUMAS", "ROMAS"]);
  expect(siteEditableDivisions(M.indira)).toEqual(["DANUS"]);
  expect(siteEditableDivisions(M.kayla)).toEqual([]);
  expect(siteEditableDivisions(M.kadepAksi)).toEqual(["AKSI"]);
  expect(siteEditableDivisions(M.wakadepRomas)).toEqual(["ROMAS"]);
  expect(siteEditableDivisions(M.staffAksi)).toEqual([]);
  expect(siteEditableDivisions(null)).toEqual([]);
});

it("keeps the dashboard's copy of the access list identical to the enforced one", () => {
  expect(dashboard.SITE_EDITORS).toEqual(SITE_EDITORS);
  for (const m of Object.values(M)) expect(dashboard.siteEditableDivisions(m)).toEqual(siteEditableDivisions(m));
});

it("validates page details: own images only, http(s) links, known keys", () => {
  expect(cleanDetails({ cover: IMG, gallery: [IMG, ""], body: " Halo ", link: "https://ig.com/x", linkLabel: "Daftar", evil: 1 }, URL_)).toEqual({
    cover: IMG,
    gallery: [IMG],
    body: "Halo",
    link: "https://ig.com/x",
    linkLabel: "Daftar",
  });
  expect(cleanDetails({ cover: "https://evil.example/x.jpg" }, URL_)).toMatch(/sampul/);
  expect(cleanDetails({ gallery: ["javascript:alert(1)"] }, URL_)).toMatch(/galeri/i);
  expect(cleanDetails({ link: "javascript:alert(1)" }, URL_)).toMatch(/https/);
  expect(cleanDetails([1], URL_)).toMatch(/tidak valid/);
  expect(cleanDetails({}, URL_)).toEqual({});
});

async function setup() {
  const pw = await hashPassword("rahasia");
  const members = Object.values(M).map((m) => ({ ...m, password_hash: pw }));
  const prokers = [
    { id: "11111111-1111-1111-1111-111111111111", division: "SEBURA" },
    { id: "22222222-2222-2222-2222-222222222222", division: "AKSI" },
  ];
  const site: Record<string, any> = {};
  const db: any = {
    select: async (t: string, q: string) => {
      const id = decodeURIComponent(q.match(/(?:^|&)(?:id|proker_id)=eq\.([^&]+)/)?.[1] ?? "");
      if (t === "members") return members.filter((m) => m.id === id);
      if (t === "prokers") return prokers.filter((p) => p.id === id);
      if (t === "site_prokers") return site[id] ? [site[id]] : [];
      return [];
    },
    insert: async (_t: string, r: any) => (site[r.proker_id] = { ...r }),
    update: async (_t: string, q: string, patch: any) => {
      const id = decodeURIComponent(q.match(/proker_id=eq\.([^&]+)/)![1]);
      Object.assign(site[id], patch);
      return [site[id]];
    },
  };
  const storage = async () => new Response(JSON.stringify({ url: "/object/upload/sign/site-images/x?token=tok" }), { status: 200 });
  const deps: any = { db, now: () => new Date("2026-10-09T10:00:00Z"), sessionSecret: "s", upload: { supabaseUrl: URL_, serviceKey: "k" }, fetchImpl: storage };
  const login = async (m: { id: string }, password = "rahasia") => handle({ action: "login", memberId: m.id, password }, deps);
  const tokenOf = async (m: { id: string }) => (await login(m)).body.token as string;
  return { deps, site, login, tokenOf, sebura: prokers[0].id, aksi: prokers[1].id };
}

it("lets people edit only their divisions' prokers, enforced on the server", async () => {
  const { deps, site, login, tokenOf, sebura, aksi } = await setup();

  expect((await login(M.sidqin, "salah")).status).toBe(401);
  expect((await login(M.kayla)).status).toBe(403); // no access, no session
  expect((await login(M.staffAksi)).status).toBe(403);
  expect((await login(M.sidqin)).body.divisions).toEqual(["SEBURA", "MEDIFO"]);

  const sidqin = await tokenOf(M.sidqin);
  const publish = (token: string, prokerId: string) =>
    handle({ action: "set_proker", token, prokerId, published: true, title: "Gelora", description: "Pentas seni" }, deps);

  expect((await publish(sidqin, sebura)).status).toBe(200);
  expect(site[sebura]).toMatchObject({ published: true, public_title: "Gelora", public_description: "Pentas seni" });
  expect((await publish(sidqin, aksi)).status).toBe(403); // not his division
  expect(site[aksi]).toBeUndefined();

  const kadep = await tokenOf(M.kadepAksi);
  expect((await publish(kadep, aksi)).status).toBe(200);
  expect((await publish(kadep, sebura)).status).toBe(403);

  // Page details, validated; updating keeps the publish flag.
  const details = await handle({ action: "set_details", token: sidqin, prokerId: sebura, details: { cover: IMG, body: "Cerita" } }, deps);
  expect(details.status).toBe(200);
  expect(site[sebura]).toMatchObject({ published: true, details: { cover: IMG, body: "Cerita" } });
  expect((await handle({ action: "set_details", token: sidqin, prokerId: sebura, details: { cover: "https://evil.example/x.jpg" } }, deps)).status).toBe(400);
  expect((await handle({ action: "set_details", token: sidqin, prokerId: aksi, details: {} }, deps)).status).toBe(403);

  // Uploads: proker folder only, and only for people with access.
  const up = await handle({ action: "upload", token: sidqin, ext: "jpg", folder: "kabinet" }, deps);
  expect(up.status).toBe(200);
  expect(String(up.body.path)).toMatch(/^prokers\//);

  // A session from the assistant (same secret) doesn't give access to people without it.
  const { signSession } = await import("../ppi-assistant/auth.ts");
  const kaylaToken = await signSession({ mid: M.kayla.id, exp: 2_000_000_000 }, "s");
  expect((await handle({ action: "set_proker", token: kaylaToken, prokerId: sebura, published: false }, deps)).status).toBe(403);

  // Forged or expired sessions are rejected.
  expect((await handle({ action: "me", token: sidqin + "x" }, deps)).status).toBe(401);
  expect((await handle({ action: "me", token: "nope" }, deps)).status).toBe(401);
});
