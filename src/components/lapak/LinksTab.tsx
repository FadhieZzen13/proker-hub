import { Button } from "@/components/ui/button";
import { ExternalLink, Plus, Trash2, LinkIcon } from "lucide-react";
import { EditableCell } from "./EditableCell";
import {
  useLapakLinks, useAddLapakLink, useUpdateLapakLink, useDeleteLapakLink,
} from "@/hooks/useLapak";

export function LinksTab({ prokerId }: { prokerId: string }) {
  const { data: links = [], isLoading } = useLapakLinks(prokerId);
  const add = useAddLapakLink();
  const update = useUpdateLapakLink();
  const del = useDeleteLapakLink();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Semua link penting untuk proker ini.</p>
        <Button size="sm" variant="outline" className="gap-1"
          onClick={() => add.mutate({ proker_id: prokerId, label: "", url: "", sort: links.length })}>
          <Plus className="h-3.5 w-3.5" /> Add link
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : links.length === 0 ? (
        <EmptyHint icon={<LinkIcon className="h-8 w-8" />} text="Belum ada link. Tambahkan dengan tombol di atas." />
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.2fr_2fr_auto] gap-3 px-4 py-2 bg-muted/30 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Deskripsi</span><span>Link</span><span>Aksi</span>
          </div>
          {links.map((l) => (
            <div key={l.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_2fr_auto] gap-2 sm:gap-3 px-4 py-2.5 border-b border-border/40 items-center">
              <EditableCell value={l.label} placeholder="Proposal, Surat Iringan…"
                onCommit={(label) => update.mutate({ id: l.id, prokerId, label })} />
              <EditableCell value={l.url} placeholder="https://…"
                onCommit={(url) => update.mutate({ id: l.id, prokerId, url })} />
              <div className="flex items-center gap-1 justify-end">
                {l.url && (
                  <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                    <a href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => del.mutate({ id: l.id, prokerId })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground/70">
      <div className="flex justify-center mb-2 opacity-50">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
