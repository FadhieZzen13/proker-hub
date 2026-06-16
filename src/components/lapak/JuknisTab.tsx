import { Button } from "@/components/ui/button";
import { Plus, Trash2, Clock } from "lucide-react";
import { EditableCell } from "./EditableCell";
import { EmptyHint } from "./LinksTab";
import {
  useLapakJuknis, useAddLapakJuknis, useUpdateLapakJuknis, useDeleteLapakJuknis,
} from "@/hooks/useLapak";

export function JuknisTab({ prokerId, canEdit = true }: { prokerId: string; canEdit?: boolean }) {
  const { data: rows = [], isLoading } = useLapakJuknis(prokerId);
  const add = useAddLapakJuknis();
  const update = useUpdateLapakJuknis();
  const del = useDeleteLapakJuknis();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Juknis / rundown acara per sesi.</p>
        {canEdit && (
          <Button size="sm" variant="outline" className="gap-1"
            onClick={() => add.mutate({ proker_id: prokerId, waktu: "", durasi: "", keterangan: "", deskripsi: "", pengisi: "", penanggung_jawab: "", properti: "", notes: "", sort: rows.length })}>
            <Plus className="h-3.5 w-3.5" /> Add sesi
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyHint icon={<Clock className="h-8 w-8" />} text="Belum ada sesi. Tambahkan baris rundown." />
      ) : (
        <div className="rounded-lg border border-border/60 overflow-x-auto">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-[0.9fr_0.7fr_1.3fr_1.6fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-muted/30 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Waktu</span><span>Durasi</span><span>Keterangan</span><span>Deskripsi</span><span>Pengisi</span><span>PJ</span><span>Properti</span><span></span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[0.9fr_0.7fr_1.3fr_1.6fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-border/40 items-start">
                <EditableCell value={r.waktu} placeholder="17:30–18:00" readOnly={!canEdit}
                  onCommit={(waktu) => update.mutate({ id: r.id, prokerId, waktu })} />
                <EditableCell value={r.durasi} placeholder="30" readOnly={!canEdit}
                  onCommit={(durasi) => update.mutate({ id: r.id, prokerId, durasi })} />
                <EditableCell value={r.keterangan} placeholder="Sesi" multiline readOnly={!canEdit}
                  onCommit={(keterangan) => update.mutate({ id: r.id, prokerId, keterangan })} />
                <EditableCell value={r.deskripsi} placeholder="Deskripsi acara" multiline readOnly={!canEdit}
                  onCommit={(deskripsi) => update.mutate({ id: r.id, prokerId, deskripsi })} />
                <EditableCell value={r.pengisi} placeholder="Pengisi" readOnly={!canEdit}
                  onCommit={(pengisi) => update.mutate({ id: r.id, prokerId, pengisi })} />
                <EditableCell value={r.penanggung_jawab} placeholder="Penanggung jawab" readOnly={!canEdit}
                  onCommit={(penanggung_jawab) => update.mutate({ id: r.id, prokerId, penanggung_jawab })} />
                <EditableCell value={r.properti} placeholder="Properti" multiline readOnly={!canEdit}
                  onCommit={(properti) => update.mutate({ id: r.id, prokerId, properti })} />
                <div className="flex justify-end">
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => del.mutate({ id: r.id, prokerId })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
