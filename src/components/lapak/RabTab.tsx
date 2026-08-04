import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Wallet, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EditableCell } from "./EditableCell";
import { EmptyHint } from "./LinksTab";
import {
  useLapakRab, useAddLapakRab, useUpdateLapakRab, useDeleteLapakRab,
} from "@/hooks/useLapak";
import { useRabComments, useAddRabComment, useDeleteRabComment } from "@/hooks/useRabComments";
import { canCommentRab } from "@/lib/roles";
import { useMemberStore } from "@/hooks/useMemberStore";

const money = (n: number) => n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function RabTab({ prokerId, canEdit = true }: { prokerId: string; canEdit?: boolean }) {
  // `canEdit` is already the RAB-specific gate (divisions running the proker +
  // Admin); the Bendahara reviews via the comment thread below instead.
  const rabCanEdit = canEdit;
  const { data: rows = [], isLoading } = useLapakRab(prokerId);
  const add = useAddLapakRab();
  const update = useUpdateLapakRab();
  const del = useDeleteLapakRab();

  const grandTotal = rows.reduce((s, r) => s + Number(r.quantity) * Number(r.harga_satuan), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Rancangan Anggaran Biaya (RM). Total dihitung otomatis.</p>
        {rabCanEdit && (
          <Button size="sm" variant="outline" className="gap-1"
            onClick={() => add.mutate({ proker_id: prokerId, kebutuhan: "", quantity: 0, satuan: "", harga_satuan: 0, sort: rows.length })}>
            <Plus className="h-3.5 w-3.5" /> Add item
          </Button>
        )}
      </div>

      {!rabCanEdit && (
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          View-only — RAB is owned by the divisions running this proker. The Bendahara reviews it by commenting below.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyHint icon={<Wallet className="h-8 w-8" />} text="Belum ada item RAB." />
      ) : (
        <div className="rounded-lg border border-border/60 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[2fr_0.8fr_0.9fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-muted/30 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Kebutuhan</span><span>Qty</span><span>Satuan</span><span>Harga Satuan</span><span>Total</span><span></span>
            </div>
            {rows.map((r) => {
              const total = Number(r.quantity) * Number(r.harga_satuan);
              return (
                <div key={r.id} className="grid grid-cols-[2fr_0.8fr_0.9fr_1fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-border/40 items-center">
                  <EditableCell value={r.kebutuhan} placeholder="Nama kebutuhan" readOnly={!rabCanEdit}
                    onCommit={(kebutuhan) => update.mutate({ id: r.id, prokerId, kebutuhan })} />
                  <EditableCell value={String(r.quantity ?? 0)} type="number" readOnly={!rabCanEdit}
                    onCommit={(v) => update.mutate({ id: r.id, prokerId, quantity: Number(v) || 0 })} />
                  <EditableCell value={r.satuan} placeholder="pcs" readOnly={!rabCanEdit}
                    onCommit={(satuan) => update.mutate({ id: r.id, prokerId, satuan })} />
                  <EditableCell value={String(r.harga_satuan ?? 0)} type="number" readOnly={!rabCanEdit}
                    onCommit={(v) => update.mutate({ id: r.id, prokerId, harga_satuan: Number(v) || 0 })} />
                  <span className="text-sm font-medium text-foreground tabular-nums">{money(total)}</span>
                  <div className="flex justify-end">
                    {rabCanEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => del.mutate({ id: r.id, prokerId })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-[2fr_0.8fr_0.9fr_1fr_1fr_auto] gap-3 px-4 py-3 bg-muted/20 items-center">
              <span className="text-sm font-semibold text-foreground">Total Keseluruhan</span>
              <span /><span /><span />
              <span className="text-sm font-bold text-primary tabular-nums">RM {money(grandTotal)}</span>
              <span />
            </div>
          </div>
        </div>
      )}

      <RabCommentsPanel prokerId={prokerId} />
    </div>
  );
}

/**
 * Budget review thread. Readable by everyone; only Admins and the Bendahara —
 * who oversee money but never edit the numbers — may post.
 */
function RabCommentsPanel({ prokerId }: { prokerId: string }) {
  const { currentMember, isAdmin } = useMemberStore();
  const { data: comments = [] } = useRabComments(prokerId);
  const addComment = useAddRabComment();
  const deleteComment = useDeleteRabComment();
  const [text, setText] = useState("");

  const canComment = canCommentRab(currentMember, isAdmin);

  const submit = async () => {
    const comment = text.trim();
    if (!comment) {
      toast.error("Write a comment first");
      return;
    }
    await addComment.mutateAsync({
      proker_id: prokerId,
      rab_id: null,
      commenter_name: currentMember?.name ?? "Admin",
      commenter_division: currentMember?.division ?? null,
      comment_text: comment,
    });
    toast.success("Comment added");
    setText("");
  };

  if (!canComment && comments.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Catatan Bendahara {comments.length > 0 && `(${comments.length})`}
        </p>
      </div>

      {canComment && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Flag figures that need revising, or approve the budget…"
          />
          <Button onClick={submit} disabled={addComment.isPending} size="sm">Post comment</Button>
        </div>
      )}

      {comments.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="rounded-md border border-border/60 bg-muted/30 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">{c.commenter_name}</span>
                  {c.commenter_division && <Badge variant="secondary" className="text-[10px] py-0">{c.commenter_division}</Badge>}
                  <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "dd MMM yyyy, HH:mm")}</span>
                </div>
                {canComment && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteComment.mutateAsync({ id: c.id, prokerId })}
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{c.comment_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
