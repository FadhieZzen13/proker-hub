// @vitest-environment node
import { describe, it, expect } from "vitest";
import { handle } from "./core.ts";

const env = { supabaseUrl: "https://proj.supabase.co", serviceKey: "service" };

function fakeFetch(opts: { adminOk?: boolean; storageOk?: boolean } = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith("/rpc/site_admin_ok")) {
      const ok = JSON.parse(String(init.body)).secret === "admin-pw" && opts.adminOk !== false;
      return new Response(JSON.stringify(ok));
    }
    if (url.includes("/storage/v1/object/upload/sign/")) {
      if (opts.storageOk === false) return new Response("bucket not found", { status: 404 });
      const path = url.split("/upload/sign/")[1];
      return new Response(JSON.stringify({ url: `/object/upload/sign/${path}?token=tok123` }));
    }
    return new Response("?", { status: 500 });
  };
  return { f: f as unknown as typeof fetch, calls };
}

describe("site-upload", () => {
  it("rejects a wrong or missing admin password", async () => {
    const { f } = fakeFetch();
    expect((await handle({ folder: "members", ext: "jpg" }, env, f)).status).toBe(401);
    expect((await handle({ adminSecret: "nope", folder: "members", ext: "jpg" }, env, f)).status).toBe(401);
  });

  it("only allows known folders and image types, and picks the file name itself", async () => {
    const { f, calls } = fakeFetch();
    expect((await handle({ adminSecret: "admin-pw", folder: "../../etc", ext: "jpg" }, env, f)).status).toBe(400);
    expect((await handle({ adminSecret: "admin-pw", folder: "members", ext: "svg" }, env, f)).status).toBe(400);
    expect((await handle({ adminSecret: "admin-pw", folder: "members", ext: "html" }, env, f)).status).toBe(400);
    const ok = await handle({ adminSecret: "admin-pw", folder: "members", ext: "PNG", path: "evil/../x" }, env, f);
    expect(ok.status).toBe(200);
    expect(ok.body.path).toMatch(/^members\/\d+-[0-9a-f]{8}\.png$/);
    expect(ok.body.token).toBe("tok123");
    expect(ok.body.contentType).toBe("image/png");
    expect(ok.body.publicUrl).toBe(`https://proj.supabase.co/storage/v1/object/public/site-images/${ok.body.path}`);
    const sign = calls.find((c) => c.url.includes("/upload/sign/"))!;
    expect(sign.url).toBe(`https://proj.supabase.co/storage/v1/object/upload/sign/site-images/${ok.body.path}`);
    expect((sign.init.headers as Record<string, string>).Authorization).toBe("Bearer service");
  });

  it("reports storage problems (e.g. bucket migration not run)", async () => {
    const { f } = fakeFetch({ storageOk: false });
    const r = await handle({ adminSecret: "admin-pw", folder: "kabinet", ext: "png" }, env, f);
    expect(r.status).toBe(502);
    expect(String(r.body.error)).toContain("404");
  });
});
