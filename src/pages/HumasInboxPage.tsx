import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNowStrict, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Bot, Inbox, Lock, Moon, RefreshCw, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useMemberStore } from "@/hooks/useMemberStore";
import { useHumasInbox, type InboxChat, type InboxMessage } from "@/hooks/useHumasInbox";

// Menu numbers -> titles, same order as humas-bot/kb/kb.md (+ 8 = handoff)
const TOPICS: Record<number, string> = {
  1: "Tentang PPI UPM",
  2: "Calon mahasiswa & pendaftaran",
  3: "Visa & imigrasi",
  4: "Kehidupan kampus",
  5: "Acara & proker",
  6: "Keanggotaan & kepengurusan",
  7: "Kerja sama & sponsorship",
  8: "Chat dengan admin",
};

const who = (c: Pick<InboxChat, "name" | "phone">) => c.name || (c.phone ? `+${c.phone}` : "Tanpa nama");
const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: localeId });

export default function HumasInboxPage() {
  const { currentMember, isAdmin } = useMemberStore();
  const allowed = isAdmin || currentMember?.division === "HUMAS";
  const [selected, setSelected] = useState<string | null>(null);
  const { token, unlock, lock, chats, messages } = useHumasInbox(currentMember?.id, selected);
  const [search, setSearch] = useState("");
  const [onlyHandoff, setOnlyHandoff] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const matches = (c: InboxChat) => !q || (c.name ?? "").toLowerCase().includes(q) || (!!digits && (c.phone ?? "").includes(digits));
    return (chats.data ?? []).filter((c) => (!onlyHandoff || c.handoff) && matches(c));
  }, [chats.data, search, onlyHandoff]);
  const current = (chats.data ?? []).find((c) => c.jid === selected) ?? null;
  const waiting = (chats.data ?? []).filter((c) => c.handoff?.open && !c.handoff.answered).length;

  if (!allowed || !currentMember) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-dashed border-border/60">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-sm font-medium">Khusus HUMAS</p>
            <p className="text-xs mt-1">Inbox WhatsApp HUMAS hanya bisa dibuka anggota HUMAS.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Inbox className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">HUMAS Inbox</h1>
            {waiting > 0 && <Badge className="bg-primary text-primary-foreground">{waiting} menunggu admin</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Semua chat ke nomor WhatsApp HUMAS, termasuk balasan bot dan admin. Pesan disimpan 30 hari.</p>
        </div>
        {token && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void chats.refetch()}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${chats.isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={lock}>
              <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock
            </Button>
          </div>
        )}
      </div>

      {!token ? (
        <Unlock onUnlock={unlock} />
      ) : (
        <div className="grid gap-4 md:grid-cols-[340px_1fr] md:h-[calc(100vh-220px)] md:min-h-[520px]">
          {/* chat list */}
          <Card className={`border-border/60 overflow-hidden flex flex-col ${selected ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b border-border/60 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau nomor" className="pl-8 h-9" />
              </div>
              <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                Hanya yang minta admin
                <Switch checked={onlyHandoff} onCheckedChange={setOnlyHandoff} />
              </label>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.isLoading && <p className="p-4 text-sm text-muted-foreground">Memuat chat…</p>}
              {chats.error && <p className="p-4 text-sm text-destructive">{(chats.error as Error).message}</p>}
              {!chats.isLoading && list.length === 0 && <p className="p-4 text-sm text-muted-foreground">Belum ada chat.</p>}
              {list.map((c) => (
                <ChatRow key={c.jid} chat={c} active={c.jid === selected} onClick={() => setSelected(c.jid)} />
              ))}
            </div>
          </Card>

          {/* thread */}
          <Card className={`border-border/60 overflow-hidden flex flex-col ${selected ? "flex" : "hidden md:flex"}`}>
            {!current ? (
              <div className="flex-1 flex items-center justify-center p-10 text-sm text-muted-foreground">Pilih chat di sebelah kiri.</div>
            ) : (
              <>
                <div className="p-3 sm:p-4 border-b border-border/60 flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelected(null)} aria-label="Kembali">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{who(current)}</p>
                    <p className="text-xs text-muted-foreground">
                      {current.phone ? `+${current.phone}` : "Nomor tersembunyi"}
                      {current.lastCategory ? ` · topik terakhir: ${TOPICS[current.lastCategory] ?? current.lastCategory}` : ""}
                    </p>
                  </div>
                  <ModeBadge chat={current} />
                </div>
                <Thread messages={messages.data ?? []} loading={messages.isLoading} />
                <p className="px-4 py-2.5 border-t border-border/60 text-[11px] text-muted-foreground">
                  Hanya baca. Balas dari HP HUMAS, lalu ketik <b>#selesai</b> di chat itu kalau sudah beres.
                </p>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function ChatRow({ chat, active, onClick }: { chat: InboxChat; active: boolean; onClick: () => void }) {
  const last = chat.lastMessage;
  const prefix = last?.direction === "bot" ? "Bot: " : last?.direction === "admin" ? "Admin: " : "";
  const needsAdmin = chat.handoff?.open && !chat.handoff.answered;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-3 border-b border-border/40 transition-colors ${active ? "bg-primary/10" : "hover:bg-muted/50"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate text-sm ${needsAdmin ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>{who(chat)}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{ago(chat.lastActivityAt)}</span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{last ? `${prefix}${last.body}` : "—"}</p>
      {chat.handoff && (
        <span
          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            needsAdmin ? "bg-primary text-primary-foreground" : "bg-green-500/10 text-green-700"
          }`}
        >
          {needsAdmin ? "Minta admin · belum dibalas" : chat.handoff.open ? "Sedang dibalas admin" : "Admin sudah membantu"}
        </span>
      )}
    </button>
  );
}

function ModeBadge({ chat }: { chat: InboxChat }) {
  return chat.mode === "human" ? (
    <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
      <UserRound className="h-3 w-3" /> Admin
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <Bot className="h-3 w-3" /> Bot
    </Badge>
  );
}

function Thread({ messages, loading }: { messages: InboxMessage[]; loading: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [messages.length]);
  if (loading) return <div className="flex-1 p-4 text-sm text-muted-foreground">Memuat pesan…</div>;
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-muted/20">
      {messages.map((m, i) => {
        const mine = m.direction !== "in";
        return (
          <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                m.direction === "in"
                  ? "bg-card border border-border/60 text-foreground rounded-bl-md"
                  : m.direction === "admin"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-br-md"
              }`}
            >
              {m.direction !== "in" && (
                <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.direction === "admin" ? "opacity-80" : "text-muted-foreground"}`}>
                  {m.direction === "admin" ? "Admin" : "Bot"}
                </p>
              )}
              {m.body.replace(/\*/g, "")}
              <p className={`mt-1 flex items-center gap-1 text-[10px] ${m.direction === "admin" ? "opacity-80" : "text-muted-foreground"}`}>
                {format(new Date(m.created_at), "dd MMM HH:mm")}
                {m.category ? ` · menu ${m.category}` : ""}
                {m.off_hours && m.direction === "in" && <Moon className="h-3 w-3" aria-label="Di luar jam admin" />}
              </p>
            </div>
          </div>
        );
      })}
      {messages.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pesan.</p>}
      <div ref={end} />
    </div>
  );
}

function Unlock({ onUnlock }: { onUnlock: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onUnlock(password);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="border-border/60 max-w-md">
      <CardContent className="p-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inbox-pw">Password akun dashboard kamu</Label>
            <Input id="inbox-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">Inbox berisi nomor dan pesan orang lain, jadi dicek dulu di server. Cukup sekali per sesi.</p>
          </div>
          <Button type="submit" disabled={!password || busy}>Buka inbox</Button>
        </form>
      </CardContent>
    </Card>
  );
}
