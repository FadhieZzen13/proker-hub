// Minimal CSV/TSV helpers for the Lapak Kerja "Form Responses" tab.

/** Parse pasted CSV/TSV text into a matrix of strings. Auto-detects delimiter. */
export function parseDelimited(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Prefer tab if the first line has more tabs than commas (Google Sheets paste = TSV).
  const firstLine = normalized.split("\n")[0] ?? "";
  const delim = (firstLine.match(/\t/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalized[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); field = ""; row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);
  // Drop trailing fully-empty rows
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function escapeCSV(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Build a CSV string from headers + rows of objects keyed by column key. */
export function toCSV(columns: { key: string; label: string }[], rows: Record<string, string>[]): string {
  const head = columns.map((c) => escapeCSV(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCSV(r[c.key] ?? "")).join(","))
    .join("\n");
  return "﻿" + head + "\n" + body;
}

/** Build an Excel-friendly CSV from plain headers + a matrix of cell values. */
export function simpleCSV(headers: (string | number)[], rows: (string | number)[][]): string {
  const head = headers.map((h) => escapeCSV(String(h))).join(",");
  const body = rows.map((r) => r.map((c) => escapeCSV(String(c ?? ""))).join(",")).join("\n");
  return "﻿" + head + "\n" + body;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Turn a header label into a stable-ish column key. */
export function slugifyKey(label: string, index: number): string {
  const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return base || `col_${index + 1}`;
}
