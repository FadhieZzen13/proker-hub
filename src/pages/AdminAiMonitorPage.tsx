import { useState } from "react";
import { format } from "date-fns";
import { Bot, Check, Lock, ShieldAlert, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMemberStore } from "@/hooks/useMemberStore";
import { useSiteAdminSecret } from "@/hooks/useSiteAdmin";
import { callAssistant } from "@/hooks/useAssistant";

interface DeleteRequest {
  id: string;
  proker_id: string;
  proker_snapshot: { nama_proker?: string; division?: string; tanggal?: string; type?: string; status?: string };
  requested_by_name: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decided_at: string | null;
  created_at: string;
}

interface ActionLog {
  id: string;
  member_name: string;
  tool: string;
  args: Record<string, unknown>;
  outcome: "done" | "requested" | "denied" | "error";
  detail: string;
  created_at: string;
}

interface MonitorData {
  requests: DeleteRequest[];
  actions: ActionLog[];
  deleteNeedsApproval: boolean;
  launchDate: string | null;
}

const TOOL_LABEL: Record<string, string> = {
  create_proker: "Buat proker",
  update_proker: "Ubah proker",
  delete_proker: "Hapus proker",
  add_tracker_entry: "Tambah tracker",
  update_tracker_entry: "Ubah tracker",
  delete_tracker_entry: "Hapus tracker",
  approve_delete: "Setujui hapus",
  reject_delete: "Tolak hapus",
};

const OUTCOME_CLASS: Record<ActionLog["outcome"], string> = {
  done: "bg-green-500/10 text-green-700 border-green-200",
  requested: "bg-amber-500/10 text-amber-700 border-amber-200",
  denied: "bg-red-500/10 text-red-600 border-red-200",
  error: "bg-muted text-muted-foreground",
};

export default function AdminAiMonitorPage() {
  const { isAdmin } = useMemberStore();
  const { secret, unlock, lock } = useSiteAdminSecret();

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-dashed border-border/60">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-sm font-medium">Admin only</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">AI Monitor</h1>
          </div>
          <p className="text-sm text-muted-foreground">Delete requests from the assistant and a log of every change it makes.</p>
        </div>
        {secret && (
          <Button variant="outline" size="sm" onClick={lock}>
            <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock
          </Button>
        )}
      </div>
      {!secret ? <UnlockCard onUnlock={unlock} /> : <Monitor secret={secret} />}
    </div>
  );
}

function UnlockCard({ onUnlock }: { onUnlock: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="border-border/60 max-w-md">
      <CardContent className="p-5">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              if (!(await onUnlock(password))) toast.error("Wrong website admin password");
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ai-admin-secret">Website admin password</Label>
            <Input id="ai-admin-secret" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">Same password as the Public Website page. Checked by the server.</p>
          </div>
          <Button type="submit" disabled={!password || busy}>Unlock</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Monitor({ secret }: { secret: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai_monitor"],
    queryFn: () => callAssistant<MonitorData>({ action: "admin_list", adminSecret: secret }),
    refetchInterval: 30_000,
  });
  const decide = useMutation({
    mutationFn: (v: { requestId: string; decision: "approve" | "reject" }) => callAssistant({ action: "admin_decide", adminSecret: secret, ...v }),
    onSuccess: (_d, v) => {
      toast.success(v.decision === "approve" ? "Proker deleted" : "Request rejected");
      qc.invalidateQueries({ queryKey: ["ai_monitor"] });
      qc.invalidateQueries({ queryKey: ["prokers"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? "Could not load the monitor."}</p>;

  const pending = data.requests.filter((r) => r.status === "pending");
  const decided = data.requests.filter((r) => r.status !== "pending");
  const approvalEnds = data.launchDate ? format(new Date(new Date(`${data.launchDate}T00:00:00+08:00`).getTime() + 7 * 864e5), "dd MMM yyyy") : null;

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-3 flex gap-2 text-sm ${data.deleteNeedsApproval ? "border-amber-300/70 bg-amber-50/50" : "border-border bg-muted/30"}`}>
        <ShieldAlert className={`h-4 w-4 shrink-0 mt-0.5 ${data.deleteNeedsApproval ? "text-amber-500" : "text-muted-foreground"}`} />
        <p className="text-foreground">
          {data.deleteNeedsApproval
            ? approvalEnds
              ? `First week: proker deletes by the assistant need your approval until ${approvalEnds}.`
              : "Launch date not set (CHAT_LAUNCH_DATE), so every proker delete by the assistant needs your approval."
            : "The first week is over: the assistant now deletes prokers directly. Every delete still shows in the activity log."}
        </p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">
            Delete requests {pending.length > 0 && <Badge className="ml-2 h-5 px-1.5 text-[10px]">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="log">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-3">
          {data.requests.length === 0 && <p className="text-sm text-muted-foreground">No delete requests yet.</p>}
          {[...pending, ...decided].map((r) => (
            <Card key={r.id} className={`border-border/60 ${r.status === "pending" ? "" : "opacity-70"}`}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{r.proker_snapshot.nama_proker ?? r.proker_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.proker_snapshot.division} · {r.proker_snapshot.tanggal} · requested by {r.requested_by_name} · {format(new Date(r.created_at), "dd MMM HH:mm")}
                  </p>
                  {r.reason && <p className="text-xs text-foreground mt-1">Reason: {r.reason}</p>}
                </div>
                {r.status === "pending" ? (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ requestId: r.id, decision: "reject" })}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={decide.isPending}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{r.proker_snapshot.nama_proker}"?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently deletes the proker and its Lapak Kerja data. It cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => decide.mutate({ requestId: r.id, decision: "approve" })}>Delete proker</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[10px] shrink-0">{r.status === "approved" ? "Approved · deleted" : "Rejected"}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          {data.actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assistant activity yet.</p>
          ) : (
            <Card className="border-border/60 divide-y divide-border">
              {data.actions.map((a) => (
                <div key={a.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-28 shrink-0">{format(new Date(a.created_at), "dd MMM HH:mm")}</span>
                  <span className="font-medium text-foreground w-40 shrink-0 truncate">{a.member_name}</span>
                  <span className="w-32 shrink-0">{TOOL_LABEL[a.tool] ?? a.tool}</span>
                  <span className="flex-1 text-xs text-muted-foreground truncate" title={a.detail}>{a.detail}</span>
                  <Badge className={`${OUTCOME_CLASS[a.outcome]} text-[10px] shrink-0 hover:bg-transparent`}>{a.outcome}</Badge>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
