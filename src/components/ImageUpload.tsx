import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadSiteImage, type SiteImageFolder } from "@/lib/siteImageUpload";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  folder: SiteImageFolder;
  adminSecret: string;
  /** Shown when nothing is uploaded yet, e.g. "Pakai foto bawaan". */
  emptyHint?: string;
  /** Preview shape. */
  aspect?: "portrait" | "landscape";
}

/** Upload / replace / remove an image for the public website. Replaces pasting image URLs. */
export function ImageUpload({ value, onChange, folder, adminSecret, emptyHint = "Belum ada gambar", aspect = "portrait" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadSiteImage(file, folder, adminSecret));
      toast.success("Gambar diunggah");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${aspect === "portrait" ? "h-16 w-[52px]" : "h-12 w-20"} shrink-0 overflow-hidden rounded border border-border bg-muted`}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5 mr-1.5" />}
            {value ? "Ganti" : "Upload"}
          </Button>
          {value && !busy && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")} aria-label="Hapus gambar">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {!value && <p className="text-[11px] text-muted-foreground">{emptyHint}</p>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
