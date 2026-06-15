import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * A spreadsheet-style cell: edits locally, commits on blur (or Ctrl/Cmd+Enter
 * for multiline) only when the value actually changed.
 */
export function EditableCell({
  value,
  onCommit,
  placeholder,
  type = "text",
  multiline = false,
  className,
  readOnly = false,
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date";
  multiline?: boolean;
  className?: string;
  readOnly?: boolean;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);

  const commit = () => {
    if ((v ?? "") !== (value ?? "")) onCommit(v);
  };

  if (readOnly) {
    return (
      <div className={`min-h-[32px] py-1.5 px-1 text-sm whitespace-pre-wrap break-words ${value ? "text-foreground" : "text-muted-foreground/50"} ${className ?? ""}`}>
        {value || placeholder || "—"}
      </div>
    );
  }

  if (multiline) {
    return (
      <Textarea
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") (e.target as HTMLTextAreaElement).blur(); }}
        className={`min-h-[34px] text-sm resize-y ${className ?? ""}`}
        rows={1}
      />
    );
  }

  return (
    <Input
      type={type}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`h-8 text-sm ${className ?? ""}`}
    />
  );
}
