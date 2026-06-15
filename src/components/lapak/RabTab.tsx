import { Button } from "@/components/ui/button";
import { Plus, Trash2, Wallet } from "lucide-react";
import { EditableCell } from "./EditableCell";
import { EmptyHint } from "./LinksTab";
import {
  useLapakRab, useAddLapakRab, useUpdateLapakRab, useDeleteLapakRab,
} from "@/hooks/useLapak";

const money = (n: number) => n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function RabTab({ prokerId }: { prokerId: string }) {
  const { data: rows = [], isLoading } = useLapakRab(prokerId);
  const add = useAddLapakRab();
  const update = useUpdateLapakRab();
  const del = useDeleteLapakRab();

  const grandTotal = rows.reduce((s, r) => s + Number(r.quantity) * Number(r.harga_satuan), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Rancangan Anggaran Biaya (RM). Total dihitung otomatis.</p>
        <Button size="sm" variant="outline" className="gap-1"
          onClick={() => add.mutate({ proker_id: prokerId, kebutuhan: "", quantity: 0, satuan: "", harga_satuan: 0, sort: rows.length })}>
          <Plus className="h-3.5 w-3.5" /> Add item
        </Button>
      </div>

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
                  <EditableCell value={r.kebutuhan} placeholder="Nama kebutuhan"
                    onCommit={(kebutuhan) => update.mutate({ id: r.id, prokerId, kebutuhan })} />
                  <EditableCell value={String(r.quantity ?? 0)} type="number"
                    onCommit={(v) => update.mutate({ id: r.id, prokerId, quantity: Number(v) || 0 })} />
                  <EditableCell value={r.satuan} placeholder="pcs"
                    onCommit={(satuan) => update.mutate({ id: r.id, prokerId, satuan })} />
                  <EditableCell value={String(r.harga_satuan ?? 0)} type="number"
                    onCommit={(v) => update.mutate({ id: r.id, prokerId, harga_satuan: Number(v) || 0 })} />
                  <span className="text-sm font-medium text-foreground tabular-nums">{money(total)}</span>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => del.mutate({ id: r.id, prokerId })}><Trash2 className="h-3.5 w-3.5" /></Button>
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
    </div>
  );
}
