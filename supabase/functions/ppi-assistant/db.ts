// Tiny PostgREST client using the service-role key (server side only).
// Plain fetch, no SDK, so the module also runs under Node for tests.

export interface Db {
  /** `query` is a PostgREST query string, e.g. "select=*&id=eq.123". */
  select<T>(table: string, query: string): Promise<T[]>;
  insert<T>(table: string, row: Record<string, unknown>): Promise<T>;
  update<T>(table: string, query: string, patch: Record<string, unknown>): Promise<T[]>;
  remove(table: string, query: string): Promise<number>;
  count(table: string, query: string): Promise<number>;
  rpc<T>(fn: string, args: Record<string, unknown>): Promise<T>;
}

export const eq = (v: string | number | boolean) => `eq.${encodeURIComponent(String(v))}`;

export function restDb(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch): Db {
  const base = `${url.replace(/\/$/, "")}/rest/v1`;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

  async function call(path: string, init: RequestInit & { prefer?: string } = {}) {
    const res = await fetchImpl(`${base}/${path}`, {
      ...init,
      headers: { ...headers, ...(init.prefer ? { Prefer: init.prefer } : {}) },
    });
    if (!res.ok) throw new Error(`db ${init.method ?? "GET"} ${path.split("?")[0]}: ${res.status} ${await res.text()}`);
    return res;
  }

  return {
    async select<T>(table: string, query: string) {
      return (await (await call(`${table}?${query}`)).json()) as T[];
    },
    async insert<T>(table: string, row: Record<string, unknown>) {
      const rows = (await (await call(table, { method: "POST", body: JSON.stringify(row), prefer: "return=representation" })).json()) as T[];
      return rows[0];
    },
    async update<T>(table: string, query: string, patch: Record<string, unknown>) {
      return (await (await call(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(patch), prefer: "return=representation" })).json()) as T[];
    },
    async remove(table: string, query: string) {
      const rows = (await (await call(`${table}?${query}`, { method: "DELETE", prefer: "return=representation" })).json()) as unknown[];
      return rows.length;
    },
    async count(table: string, query: string) {
      const res = await call(`${table}?${query}&select=id`, { method: "HEAD", prefer: "count=exact" });
      return Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
    },
    async rpc<T>(fn: string, args: Record<string, unknown>) {
      return (await (await call(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) })).json()) as T;
    },
  };
}
