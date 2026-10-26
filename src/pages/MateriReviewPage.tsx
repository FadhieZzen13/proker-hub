import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, ExternalLink, FileText, Library, Link2, Lock, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMemberStore } from "@/hooks/useMemberStore";

// Review queue for the public site's /materi: submissions wait here until an admin or AKSI
// member approves them. Goes through the `materi` Edge Function (the table is private).

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/materi`;
const FILE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/materi/`;

interface MateriItem {
  id: string;
  title: string;
  faculty: string;
  course: string;
  category: string;
  uploader_name: string;
  intake: string;
  link_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  status: "pending" | "approved";
  created_at: string;
}

class MateriError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new MateriError("Tidak bisa terhubung. Cek koneksi kamu.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new MateriError((data as { error?: string }).error ?? `Error ${res.status}`, res.status);
  return data as T;
}

// Same session key as the assistant / HUMAS Inbox; the assistant stores it JSON-encoded.
const tokenKey = (memberId: string) => `ppi_assistant_token_${memberId}`;
function readToken(memberId?: string): string | null {
  if (!memberId) return null;
  try {
    const raw = sessionStorage.getItem(tokenKey(memberId));
    if (!raw) return null;
    return raw.startsWith('"') ? (JSON.parse(raw) as string) : raw;
  } catch {
    return null;
  }
}

const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: localeId });
const mb = (n: number | null) => (n ? `${(n / 1024 / 1024).toFixed(1)} MB` : "");
const urlOf = (m: MateriItem) => m.link_url ?? (m.file_path ? FILE_BASE + m.file_path.split("/").map(encodeURIComponent).join("/") : "#");

export default function MateriReviewPage() {
  const { currentMember, isAdmin } = useMemberStore();
  const allowed = isAdmin || currentMember?.division === "AKSI";
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(() => readToken(currentMember?.id));
  const [busyId, setBusyId] = useState<string | null>(null);

  const onAuthError = (e: unknown) => {
    if (e instanceof MateriError && (e.status === 401 || e.status === 403)) setToken(null);
  };

  const items = useQuery({
    queryKey: ["materi_review", token],
    enabled: !!token,
    refetchInterval: 60_000,
    queryFn: async () => {
      try {
        return (await call<{ items: MateriItem[] }>({ action: "list", token })).items;
      } catch (e) {
        onAuthError(e);
        throw e;
      }
    },
  });

  const pending = useMemo(() => (items.data ?? []).filter((m) => m.status === "pending"), [items.data]);
  const approved = useMemo(() => (items.data ?? []).filter((m) => m.status === "approved"), [items.data]);

  const act = async (action: "approve" | "reject", m: MateriItem) => {
    if (action === "reject" && !window.confirm(`Hapus "${m.title}"? ${m.file_path ? "File-nya ikut dihapus." : ""}`)) return;
    setBusyId(m.id);
    try {
      await call({ action, token, id: m.id });
      toast.success(action === "approve" ? "Materi tampil di website" : "Materi dihapus");
      await qc.invalidateQueries({ queryKey: ["materi_review"] });
    } catch (e) {
      onAuthError(e);
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (!allowed || !currentMember) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-dashed border-border/60">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-sm font-medium">Khusus admin dan AKSI</p>
            <p className="text-xs mt-1">Login pakai akun member kamu sendiri untuk review materi.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Library className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Review Materi</h1>
            {pending.length > 0 && <Badge className="bg-primary text-primary-foreground">{pending.length} menunggu</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Kiriman dari halaman Materi di website publik. Baru tampil setelah di-approve.</p>
        </div>
        {token && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void items.refetch()}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${items.isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setToken(null)}>
              <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock
            </Button>
          </div>
        )}
      </div>

      {!token ? (
        <Unlock
          onUnlock={async (password) => {
            const r = await call<{ token: string }>({ action: "login", memberId: currentMember.id, password });
            sessionStorage.setItem(tokenKey(currentMember.id), JSON.stringify(r.token));
            setToken(r.token);
          }}
        />
      ) : (
        <>
          {items.isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
          {items.error && <p className="text-sm text-destructive">{(items.error as Error).message}</p>}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Menunggu review</h2>
            {!items.isLoading && pending.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kiriman baru.</p>}
            {pending.map((m) => (
              <Card key={m.id} className="border-border/60">
                <CardContent className="p-4 space-y-3">
                  <ItemInfo m={m} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={urlOf(m)} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Cek dulu
                      </a>
                    </Button>
                    <Button size="sm" disabled={busyId === m.id} onClick={() => void act("approve", m)}>
                      <Check className="h-3.5 w-3.5 mr-1.5" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busyId === m.id} onClick={() => void act("reject", m)}>
                      <X className="h-3.5 w-3.5 mr-1.5" /> Tolak
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          {approved.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Sudah tampil di website ({approved.length})</h2>
              <Card className="border-border/60 divide-y divide-border">
                {approved.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <ItemInfo m={m} compact />
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild>
                      <a href={urlOf(m)} target="_blank" rel="noreferrer" aria-label="Buka"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={busyId === m.id} onClick={() => void act("reject", m)} aria-label="Hapus dari website">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ItemInfo({ m, compact = false }: { m: MateriItem; compact?: boolean }) {
  const Icon = m.link_url ? Link2 : FileText;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-semibold text-foreground truncate">{m.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[m.category, m.course, m.faculty].filter(Boolean).join(" · ")}
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {m.uploader_name}{m.intake ? ` (${m.intake})` : ""} · {ago(m.created_at)} · {m.link_url ? new URL(m.link_url).hostname : `${m.file_name} ${mb(m.file_size)}`}
          </p>
        )}
      </div>
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
            <Label htmlFor="materi-pw">Password akun dashboard kamu</Label>
            <Input id="materi-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">Dicek di server sebelum bisa approve. Cukup sekali per sesi.</p>
          </div>
          <Button type="submit" disabled={!password || busy}>Buka</Button>
        </form>
      </CardContent>
    </Card>
  );
}
