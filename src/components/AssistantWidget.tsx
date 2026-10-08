import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Clock, Loader2, Lock, RotateCcw, Send, ShieldBan, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemberStore } from "@/hooks/useMemberStore";
import { useAssistant, type ActionReceipt } from "@/hooks/useAssistant";
import { isBPH, isLeader } from "@/lib/roles";
import { ChatMarkdown } from "./ChatMarkdown";

const SUGGESTIONS = ["Proker divisi aku apa aja?", "Isi tracker bulan ini: ", "Proker yang akan datang bulan ini?"];

/** Floating PPI UPM assistant. Members only (the admin account has no member identity). */
export function AssistantWidget() {
  const { currentMember } = useMemberStore();
  const { token, turns, busy, error, unlock, send, reset } = useAssistant(currentMember?.id);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [password, setPassword] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy, open]);

  if (!currentMember) return null;

  const canWrite = isBPH(currentMember) || isLeader(currentMember);
  const submit = () => {
    if (!draft.trim() || busy) return;
    send(draft);
    setDraft("");
  };

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-card-hover"
          size="icon"
          aria-label="Buka Asisten PPI"
        >
          <Bot className="h-5 w-5" />
        </Button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-3 top-16 z-40 flex flex-col rounded-lg border border-border bg-card shadow-card-hover sm:inset-x-auto sm:right-5 sm:bottom-5 sm:top-auto sm:h-[560px] sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Bot className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Asisten PPI</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {canWrite ? "Bisa bantu kelola proker & tracker kamu" : "Bisa jawab soal PPI & isi tracker kamu"}
              </p>
            </div>
            {token && turns.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset} aria-label="Mulai percakapan baru" title="Mulai baru">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Tutup">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!token ? (
            /* Password step: the server verifies it and issues a session */
            <form
              className="flex flex-1 flex-col justify-center gap-3 p-6"
              onSubmit={(e) => {
                e.preventDefault();
                unlock(password).then(() => setPassword(""));
              }}
            >
              <Lock className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="text-center text-sm text-foreground">Masukkan password akun kamu untuk memakai asisten.</p>
              <p className="text-center text-xs text-muted-foreground">Asisten bertindak atas nama akun kamu, jadi identitasnya dicek ulang.</p>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoFocus />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={!password || busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mulai"}
              </Button>
            </form>
          ) : (
            <>
              {/* Messages */}
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {turns.length === 0 && (
                  <div className="space-y-3 pt-4">
                    <p className="text-center text-sm text-muted-foreground">
                      Halo {currentMember.name.split(" ")[0]}! Tanya apa saja soal PPI UPM.
                    </p>
                    <div className="flex flex-col gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDraft(s)}
                          className="rounded-md border border-border px-3 py-2 text-left text-xs text-foreground hover:border-primary/40 hover:bg-secondary"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {turns.map((t, i) => (
                  <div key={i} className={`flex flex-col ${t.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        t.role === "user"
                          ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                          : t.blocked
                            ? "border border-border bg-muted/40 text-muted-foreground"
                            : "bg-secondary text-foreground"
                      }`}
                    >
                      {t.role === "assistant" && t.blocked && <ShieldBan className="mb-1 h-3.5 w-3.5" />}
                      {t.role === "assistant" ? <ChatMarkdown text={t.content} /> : t.content}
                    </div>
                    {t.actions && <Receipts actions={t.actions} />}
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Asisten sedang mengetik...
                  </div>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              {/* Composer */}
              <form
                className="flex items-end gap-2 border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Tulis pesan..."
                  className="max-h-32 min-h-10 resize-none"
                />
                <Button type="submit" size="icon" disabled={!draft.trim() || busy} aria-label="Kirim">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

const RECEIPT_STYLE: Record<ActionReceipt["outcome"], { icon: typeof CheckCircle2; className: string }> = {
  done: { icon: CheckCircle2, className: "border-green-200 bg-green-500/10 text-green-700" },
  requested: { icon: Clock, className: "border-amber-200 bg-amber-500/10 text-amber-700" },
  denied: { icon: XCircle, className: "border-red-200 bg-red-500/10 text-red-600" },
  error: { icon: XCircle, className: "border-border bg-muted text-muted-foreground" },
};

/** Verified by the server: only these mean something actually changed. */
function Receipts({ actions }: { actions: ActionReceipt[] }) {
  return (
    <div className="mt-1.5 flex max-w-[85%] flex-col gap-1">
      {actions.map((a, i) => {
        const { icon: Icon, className } = RECEIPT_STYLE[a.outcome];
        return (
          <div key={i} className={`flex items-start gap-1.5 rounded-md border px-2 py-1 text-[11px] leading-snug ${className}`} data-testid="receipt">
            <Icon className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{a.label}</span>
          </div>
        );
      })}
    </div>
  );
}
