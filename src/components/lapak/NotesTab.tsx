import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useLapakNotes, useSaveLapakNotes } from "@/hooks/useLapak";

export function NotesTab({ prokerId }: { prokerId: string }) {
  const { data: saved = "", isLoading } = useLapakNotes(prokerId);
  const save = useSaveLapakNotes();
  const [content, setContent] = useState("");

  useEffect(() => { setContent(saved); }, [saved]);

  const dirty = content !== saved;

  const handleSave = () => {
    save.mutate({ prokerId, content }, { onSuccess: () => toast.success("Notes saved") });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Catatan bebas untuk proker ini.</p>
        <Button size="sm" className="gap-1" onClick={handleSave} disabled={!dirty || save.isPending}>
          <Save className="h-3.5 w-3.5" /> {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      <Textarea
        value={isLoading ? "" : content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Tulis catatan, evaluasi, reminder…"
        className="min-h-[280px] text-sm leading-relaxed"
      />
    </div>
  );
}
