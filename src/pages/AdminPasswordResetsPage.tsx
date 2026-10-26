import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { Copy, KeyRound, Link2, Lock, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemberStore } from "@/hooks/useMemberStore";
import { ResetError, resetCall, resetLink } from "@/lib/passwordReset";

interface ResetRequest {
  id: string;
  memberId: string;
  name: string;
  division: string;
  phone: string | null;
  contact: string | null;
  note: string | null;
  status: "pending" | "link_sent" | "expired" | "done" | "dismissed";
  expiresAt: string | null;
  createdAt: string;
}

const STATUS: Record<ResetRequest["status"], string> = {
  pending: "Waiting",
  link_sent: "Link sent",
  expired: "Link expired",
  done: "Reset done",
  dismissed: "Dismissed",
};

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

const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

export default function AdminPasswordResetsPage() {
  const { currentMember, isAdmin, members } = useMemberStore();
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(() => readToken(currentMember?.id));
  const [links, setLinks] = useState<Record<string, string>>({}); // request id -> link, this session only
  const [directMember, setDirectMember] = useState("");

  const onAuthError = (e: unknown) => {
    if (e instanceof ResetError && (e.status === 401 || e.status === 403)) setToken(null);
  };

  const requests = useQuery({
    queryKey: ["password_resets", token],
    enabled: !!token,
    refetchInterval: 30_000,
    queryFn: async () => {
      try {
        return (await resetCall<{ requests: ResetRequest[] }>({ action: "list", token })).requests;
      } catch (e) {
        onAuthError(e);
        throw e;
      }
    },
  });

  const open = useMemo(() => (requests.data ?? []).filter((r) => r.status === "pending" || r.status === "link_sent" || r.status === "expired"), [requests.data]);
  const closed = useMemo(() => (requests.data ?? []).filter((r) => r.status === "done" || r.status === "dismissed"), [requests.data]);

  const makeLink = async (body: { requestId?: string; memberId?: string }) => {
    try {
      const r = await resetCall<{ token: string; requestId: string }>({ action: "create_link", token, ...body });
      const url = resetLink(r.token);
      setLinks((l) => ({ ...l, [r.requestId]: url }));
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link created and copied. It works once, for 48 hours.");
      await qc.invalidateQueries({ queryKey: ["password_resets"] });
      return url;
    } catch (e) {
      onAuthError(e);
      toast.error((e as Error).message);
      return null;
    }
  };

  const dismiss = async (requestId: string) => {
    try {
      await resetCall({ action: "dismiss", token, requestId });
      await qc.invalidateQueries({ queryKey: ["password_resets"] });
    } catch (e) {
      onAuthError(e);
      toast.error((e as Error).message);
    }
  };

  if (!isAdmin || !currentMember) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-dashed border-border/60">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-sm font-medium">Admins only</p>
            <p className="text-xs mt-1">Log in with your own admin member account (not the shared admin login) to handle password resets.</p>
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
            <KeyRound className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Password Resets</h1>
            {open.filter((r) => r.status === "pending").length > 0 && (
              <Badge className="bg-primary text-primary-foreground">{open.filter((r) => r.status === "pending").length} waiting</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Members who forgot their password ask from the login screen. Make a one-time link and send it to them on WhatsApp.</p>
        </div>
        {token && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void requests.refetch()}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${requests.isFetching ? "animate-spin" : ""}`} /> Refresh
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
            const r = await resetCall<{ token: string }>({ action: "login", memberId: currentMember.id, password });
            sessionStorage.setItem(tokenKey(currentMember.id), JSON.stringify(r.token));
            setToken(r.token);
          }}
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Open requests</h2>
            {requests.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {requests.error && <p className="text-sm text-destructive">{(requests.error as Error).message}</p>}
            {!requests.isLoading && open.length === 0 && <p className="text-sm text-muted-foreground">No open requests.</p>}
            {open.map((r) => {
              const link = links[r.id];
              const phone = r.contact || r.phone;
              return (
                <Card key={r.id} className="border-border/60">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{r.name} <span className="text-xs font-normal text-muted-foreground">· {r.division}</span></p>
                        <p className="text-xs text-muted-foreground">
                          Asked {ago(r.createdAt)}
                          {phone ? ` · WA ${phone}` : " · no number on file"}
                        </p>
                        {r.note && <p className="mt-1 text-sm text-foreground/80">“{r.note}”</p>}
                      </div>
                      <Badge variant="outline" className={r.status === "pending" ? "border-primary/40 text-primary" : ""}>{STATUS[r.status]}</Badge>
                    </div>
                    {link && (
                      <div className="flex gap-2">
                        <Input readOnly value={link} className="h-9 text-xs" onFocus={(e) => e.target.select()} />
                        <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success("Copied"))}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void makeLink({ requestId: r.id })}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" /> {r.status === "pending" ? "Create link" : "New link"}
                      </Button>
                      {link && phone && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={waLink(phone, `Hi ${r.name.split(" ")[0]}, ini link buat reset password dashboard PPI UPM lu (cuma bisa dipake sekali, berlaku 48 jam):\n${link}`)} target="_blank" rel="noreferrer">
                            Send on WhatsApp
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => void dismiss(r.id)}>
                        <X className="h-3.5 w-3.5 mr-1.5" /> Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Make a link for someone directly</h2>
                <p className="text-xs text-muted-foreground">For when they asked you in person instead of through the login screen.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={directMember} onValueChange={setDirectMember}>
                  <SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="Pick a member" /></SelectTrigger>
                  <SelectContent>
                    {[...members].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} · {m.division}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!directMember}
                  onClick={async () => {
                    const url = await makeLink({ memberId: directMember });
                    if (url) setDirectMember("");
                  }}
                >
                  <Link2 className="h-3.5 w-3.5 mr-1.5" /> Create link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">The link is copied right away and shows up under Open requests.</p>
            </CardContent>
          </Card>

          {closed.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Last 30 days</h2>
              {closed.map((r) => (
                <p key={r.id} className="text-sm text-muted-foreground">
                  {r.name} · {STATUS[r.status]} · {ago(r.createdAt)}
                </p>
              ))}
            </section>
          )}
        </>
      )}
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
            <Label htmlFor="reset-pw">Your dashboard password</Label>
            <Input id="reset-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">Checked on the server, since this page can change other people's passwords. Once per session.</p>
          </div>
          <Button type="submit" disabled={!password || busy}>Unlock</Button>
        </form>
      </CardContent>
    </Card>
  );
}
