import { Fragment, type ReactNode } from "react";

// Minimal Markdown for assistant chat bubbles: paragraphs, bullet / numbered lists,
// **bold**, *italic*, `code`. Builds React elements (no HTML injection), so model
// output can never insert markup. Anything else is shown as plain text.

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={m.index} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={m.index} className="rounded bg-background/60 px-1 py-0.5 text-[0.85em]">{tok.slice(1, -1)}</code>);
    else out.push(<em key={m.index}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { kind: "p"; lines: string[] } | { kind: "ul" | "ol"; items: string[][]; start: number };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*(\d+)[.)]\s+(.*)$/;

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(/^#{1,6}\s+/, ""); // headings -> plain line
    const last = blocks[blocks.length - 1];
    const b = line.match(BULLET);
    const n = line.match(NUMBER);
    if (b || n) {
      const kind = b ? "ul" : "ol";
      const content = b ? b[1] : n![2];
      if (last && last.kind === kind) last.items.push([content]);
      else blocks.push({ kind, items: [[content]], start: n ? Number(n[1]) : 1 });
    } else if (!line.trim()) {
      blocks.push({ kind: "p", lines: [] }); // paragraph break
    } else if (last && last.kind !== "p" && /^\s{2,}\S/.test(raw)) {
      last.items[last.items.length - 1].push(line.trim()); // indented continuation of a list item
    } else if (last && last.kind === "p" && last.lines.length) {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "p", lines: [line] });
    }
  }
  return blocks.filter((bl) => (bl.kind === "p" ? bl.lines.length > 0 : true));
}

const lines = (ls: string[]) => ls.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{inline(l)}</Fragment>);

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 leading-relaxed">
      {parse(text).map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>{lines(b.lines)}</p>
        ) : b.kind === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((it, j) => <li key={j}>{lines(it)}</li>)}
          </ul>
        ) : (
          <ol key={i} start={b.start} className="list-decimal space-y-1 pl-5">
            {b.items.map((it, j) => <li key={j}>{lines(it)}</li>)}
          </ol>
        )
      )}
    </div>
  );
}
