import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Download, Table2, ClipboardPaste, Columns3 } from "lucide-react";
import { toast } from "sonner";
import { EditableCell } from "./EditableCell";
import { EmptyHint } from "./LinksTab";
import { parseDelimited, toCSV, downloadCSV, slugifyKey } from "@/lib/csv";
import {
  useResponseSets, useResponseRows, useCreateResponseSet, useUpdateResponseSet,
  useDeleteResponseSet, useAddResponseRow, useImportResponseRows, useUpdateResponseRow,
  useDeleteResponseRow, type ResponseColumn,
} from "@/hooks/useLapak";

export function ResponsesTab({ prokerId }: { prokerId: string }) {
  const { data: sets = [], isLoading } = useResponseSets(prokerId);
  const createSet = useCreateResponseSet();
  const importRows = useImportResponseRows();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    if (sets.length && !sets.some((s) => s.id === activeId)) setActiveId(sets[0].id);
    if (!sets.length) setActiveId(null);
  }, [sets, activeId]);

  const active = sets.find((s) => s.id === activeId) ?? null;

  const handleCreate = async () => {
    const name = newName.trim() || "Form Responses";
    let columns: ResponseColumn[] = [];
    let dataRows: Record<string, string>[] = [];
    if (pasteText.trim()) {
      const matrix = parseDelimited(pasteText);
      if (matrix.length) {
        const headers = matrix[0];
        columns = headers.map((h, i) => ({ key: slugifyKey(h, i), label: h.trim() || `Column ${i + 1}` }));
        dataRows = matrix.slice(1).map((r) => {
          const obj: Record<string, string> = {};
          columns.forEach((c, i) => { obj[c.key] = r[i] ?? ""; });
          return obj;
        });
      }
    }
    if (!columns.length) columns = [{ key: "col_1", label: "Column 1" }];

    const set = await createSet.mutateAsync({ proker_id: prokerId, name, columns });
    if (dataRows.length) await importRows.mutateAsync({ setId: set.id, rows: dataRows });
    setActiveId(set.id);
    setShowCreate(false);
    setNewName(""); setPasteText("");
    toast.success(`Response set created${dataRows.length ? ` with ${dataRows.length} rows` : ""}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Lihat / impor respons form (mirip spreadsheet).</p>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> New response set
        </Button>
      </div>

      {sets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sets.map((s) => (
            <button key={s.id} onClick={() => setActiveId(s.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                s.id === activeId ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}>{s.name}</button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : !active ? (
        <EmptyHint icon={<Table2 className="h-8 w-8" />} text="Belum ada response set. Buat baru lalu paste data dari Google Sheets/Form." />
      ) : (
        <ResponseSetView key={active.id} prokerId={prokerId} setId={active.id} name={active.name} columns={active.columns} />
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New response set</DialogTitle>
            <DialogDescription>Beri nama, lalu (opsional) paste data CSV/TSV — baris pertama jadi header kolom.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Registration Form, Feedback Survey…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Paste data (optional)</Label>
              <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
                placeholder={"Timestamp\tNama\tDivisi\n2026-01-08\tFulan\tHUMAS"}
                className="min-h-[140px] font-mono text-xs" />
              <p className="text-[11px] text-muted-foreground">Copy a range from Google Sheets and paste here. Tab or comma separated.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createSet.isPending || importRows.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResponseSetView({
  prokerId, setId, name, columns,
}: { prokerId: string; setId: string; name: string; columns: ResponseColumn[] }) {
  const { data: rows = [] } = useResponseRows(setId);
  const updateSet = useUpdateResponseSet();
  const deleteSet = useDeleteResponseSet();
  const addRow = useAddResponseRow();
  const importRows = useImportResponseRows();
  const updateRow = useUpdateResponseRow();
  const deleteRow = useDeleteResponseRow();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const setColumns = (next: ResponseColumn[]) => updateSet.mutate({ id: setId, prokerId, columns: next });

  const addColumn = () => setColumns([...columns, { key: `col_${Date.now()}`, label: `Column ${columns.length + 1}` }]);
  const renameColumn = (key: string, label: string) => setColumns(columns.map((c) => (c.key === key ? { ...c, label } : c)));
  const removeColumn = (key: string) => setColumns(columns.filter((c) => c.key !== key));

  const exportCSV = () => {
    downloadCSV(`${name.replace(/[^a-z0-9]+/gi, "_")}.csv`, toCSV(columns, rows.map((r) => r.data)));
    toast.success("CSV exported");
  };

  const handlePasteRows = async () => {
    const matrix = parseDelimited(pasteText);
    if (!matrix.length) { setShowPaste(false); return; }
    // Map columns positionally to existing columns (skip a header row if it matches labels).
    const looksLikeHeader = matrix[0].every((v, i) => v.trim().toLowerCase() === (columns[i]?.label ?? "").trim().toLowerCase());
    const body = looksLikeHeader ? matrix.slice(1) : matrix;
    const dataRows = body.map((r) => {
      const obj: Record<string, string> = {};
      columns.forEach((c, i) => { obj[c.key] = r[i] ?? ""; });
      return obj;
    });
    await importRows.mutateAsync({ setId, rows: dataRows });
    setShowPaste(false); setPasteText("");
    toast.success(`Imported ${dataRows.length} rows`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="gap-1" onClick={() => addRow.mutate({ set_id: setId, data: {}, sort: rows.length })}>
          <Plus className="h-3.5 w-3.5" /> Row
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={addColumn}>
          <Columns3 className="h-3.5 w-3.5" /> Column
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPaste(true)}>
          <ClipboardPaste className="h-3.5 w-3.5" /> Paste rows
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={exportCSV} disabled={!rows.length}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{rows.length} responses</span>
        <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete set
        </Button>
      </div>

      <div className="rounded-lg border border-border/60 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="w-9 border-b border-border/60 px-2 py-2 text-xs text-muted-foreground">#</th>
              {columns.map((c) => (
                <th key={c.key} className="border-b border-l border-border/60 px-1 py-1 min-w-[160px]">
                  <div className="flex items-center gap-1">
                    <EditableCell value={c.label} onCommit={(label) => renameColumn(c.key, label)} className="font-semibold" />
                    <button className="text-muted-foreground/60 hover:text-destructive shrink-0" title="Remove column"
                      onClick={() => removeColumn(c.key)}><Trash2 className="h-3 w-3" /></button>
                  </div>
                </th>
              ))}
              <th className="w-10 border-b border-l border-border/60 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length + 2} className="px-4 py-8 text-center text-sm text-muted-foreground">No responses. Add a row or paste data.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-muted/10">
                <td className="border-b border-border/40 px-2 py-1 text-center text-xs text-muted-foreground/60">{i + 1}</td>
                {columns.map((c) => (
                  <td key={c.key} className="border-b border-l border-border/40 px-1 py-1">
                    <EditableCell value={r.data[c.key] ?? ""}
                      onCommit={(v) => updateRow.mutate({ id: r.id, setId, data: { ...r.data, [c.key]: v } })} />
                  </td>
                ))}
                <td className="border-b border-l border-border/40 px-1 py-1 text-center">
                  <button className="text-muted-foreground/60 hover:text-destructive" onClick={() => deleteRow.mutate({ id: r.id, setId })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showPaste} onOpenChange={setShowPaste}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paste rows</DialogTitle>
            <DialogDescription>Columns map left-to-right onto the existing columns. A header row matching your column names is skipped.</DialogDescription>
          </DialogHeader>
          <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} className="min-h-[160px] font-mono text-xs" placeholder="Paste CSV/TSV rows…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaste(false)}>Cancel</Button>
            <Button onClick={handlePasteRows} disabled={importRows.isPending}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the response set and all its rows. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => { deleteSet.mutate({ id: setId, prokerId }); setConfirmDelete(false); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
