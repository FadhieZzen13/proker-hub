import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Globe, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemberStore } from "@/hooks/useMemberStore";
import { useProkers, DIVISIONS, type Proker } from "@/hooks/useProkers";
import {
  useSiteAdminSecret,
  useSiteProkers,
  useSetSiteProker,
  useSiteContent,
  useSaveSiteContent,
  type SiteProker,
} from "@/hooks/useSiteAdmin";
import type { SiteContent } from "@/lib/siteContent";
import { getProkerDisplayName } from "@/lib/prokerDisplay";

export default function AdminWebsitePage() {
  const { isAdmin } = useMemberStore();
  const { secret, unlock, lock } = useSiteAdminSecret();

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-dashed border-border/60">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-sm font-medium">Admin only</p>
            <p className="text-xs mt-1">You do not have access to manage the public website.</p>
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
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Public Website</h1>
          </div>
          <p className="text-sm text-muted-foreground">Choose which prokers appear on the public site and edit its content.</p>
        </div>
        {secret && (
          <Button variant="outline" size="sm" onClick={lock}>
            <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock
          </Button>
        )}
      </div>

      {!secret ? (
        <UnlockCard onUnlock={unlock} />
      ) : (
        <Tabs defaultValue="prokers">
          <TabsList>
            <TabsTrigger value="prokers">Prokers</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>
          <TabsContent value="prokers" className="mt-4">
            <ProkersTab secret={secret} />
          </TabsContent>
          <TabsContent value="content" className="mt-4">
            <ContentTab secret={secret} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function UnlockCard({ onUnlock }: { onUnlock: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!(await onUnlock(password))) toast.error("Wrong website admin password");
    } catch (err) {
      toast.error(`Could not check password: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border/60 max-w-md">
      <CardContent className="p-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="site-secret">Website admin password</Label>
            <Input id="site-secret" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">Separate from the dashboard login. It is checked by the database before any change is saved.</p>
          </div>
          <Button type="submit" disabled={!password || busy}>Unlock</Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------- Prokers ----------------

function ProkersTab({ secret }: { secret: string }) {
  const { data: prokers = [], isLoading } = useProkers();
  const { data: siteProkers = [] } = useSiteProkers();
  const save = useSetSiteProker(secret);

  const rows = useMemo(
    () => prokers.filter((p) => p.lapak_ready).sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
    [prokers]
  );
  const byId = useMemo(() => new Map(siteProkers.map((s) => [s.proker_id, s])), [siteProkers]);
  const publishedCount = siteProkers.filter((s) => s.published).length;

  const persist = async (value: SiteProker, message: string) => {
    try {
      await save.mutateAsync(value);
      toast.success(message);
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading prokers...</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {publishedCount} of {rows.length} active prokers are public. Drafts (Lapak Kerja not finished) never appear on the website.
      </p>
      {rows.map((p) => (
        <ProkerRow key={p.id} proker={p} site={byId.get(p.id)} onSave={persist} />
      ))}
    </div>
  );
}

function ProkerRow({
  proker,
  site,
  onSave,
}: {
  proker: Proker;
  site?: SiteProker;
  onSave: (value: SiteProker, message: string) => Promise<void>;
}) {
  const current: SiteProker = site ?? { proker_id: proker.id, published: false, public_title: "", public_description: "" };
  const [title, setTitle] = useState(current.public_title);
  const [description, setDescription] = useState(current.public_description);
  useEffect(() => {
    setTitle(current.public_title);
    setDescription(current.public_description);
  }, [current.public_title, current.public_description]);

  const dirty = title !== current.public_title || description !== current.public_description;
  const internalName = getProkerDisplayName(proker.nama_proker, proker.description);

  return (
    <Card className={`border-border/60 ${current.published ? "" : "opacity-80"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{internalName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {proker.division} · {proker.type} · {format(new Date(proker.tanggal), "dd MMM yyyy")}
              {proker.status === "complete" && <Badge className="ml-2 bg-green-500/10 text-green-600 border-green-200 text-[10px]">Done</Badge>}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
            {current.published ? "Public" : "Hidden"}
            <Switch
              checked={current.published}
              onCheckedChange={(checked) =>
                onSave({ ...current, published: checked, public_title: title, public_description: description }, checked ? "Shown on website" : "Hidden from website")
              }
            />
          </label>
        </div>

        {current.published && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
            <div className="space-y-1.5">
              <Label className="text-xs">Public title (optional)</Label>
              <Input value={title} placeholder={internalName} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Public description</Label>
              <Textarea rows={2} value={description} placeholder="Short description for visitors. Internal notes are never shown." onChange={(e) => setDescription(e.target.value)} />
            </div>
            {dirty && (
              <div className="sm:col-span-2 flex justify-end">
                <Button size="sm" onClick={() => onSave({ ...current, public_title: title, public_description: description }, "Saved")}>Save text</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Content ----------------

type Latest = NonNullable<SiteContent["latest"]>[number];

function ContentTab({ secret }: { secret: string }) {
  const { data: saved, isLoading } = useSiteContent();
  const save = useSaveSiteContent(secret);
  const [c, setC] = useState<SiteContent>({});
  // Line-based fields are edited as raw text and parsed on save, so blank lines survive typing.
  const [missionsText, setMissionsText] = useState("");
  useEffect(() => {
    if (!saved) return;
    setC(saved);
    setMissionsText((saved.missions ?? []).join("\n"));
  }, [saved]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading content...</p>;

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => setC((prev) => ({ ...prev, [key]: value }));
  const setNested = <K extends "home" | "socials" | "sections">(key: K, field: string, value: unknown) =>
    setC((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));
  const setDivision = (code: string, field: "name" | "description", value: string) =>
    setC((prev) => ({ ...prev, divisions: { ...prev.divisions, [code]: { ...prev.divisions?.[code], [field]: value } } }));
  const latest = c.latest ?? [];
  const setLatest = (next: Latest[]) => set("latest", next);

  const submit = async () => {
    try {
      const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
      await save.mutateAsync({
        ...c,
        missions: lines(missionsText),
      });
      toast.success("Website content saved");
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <Section title="Sections" hint="Turn parts of the website on or off.">
        <ToggleRow label="Show 'Terbaru' (latest updates) on the home page" checked={c.sections?.latest ?? true} onChange={(v) => setNested("sections", "latest", v)} />
        <ToggleRow label="Show Kadep / Wakadep names on the Tentang Kami page" checked={c.sections?.pengurus ?? false} onChange={(v) => setNested("sections", "pengurus", v)} />
      </Section>

      <Section title="Welcome (home page)">
        <Field label="Title" value={c.home?.headline} placeholder="Selamat Datang" onChange={(v) => setNested("home", "headline", v)} />
        <Field label="Intro paragraph" value={c.home?.lead} multiline onChange={(v) => setNested("home", "lead", v)} />
        <Field label="Group photo URL (shown under the intro)" value={c.heroImage} onChange={(v) => set("heroImage", v)} />
      </Section>

      <Section title="About">
        <Field label="Term / kabinet period" value={c.term} placeholder="2026/2027" onChange={(v) => set("term", v)} />
        <Field label="About PPI UPM" value={c.about} multiline onChange={(v) => set("about", v)} />
        <Field label="Visi" value={c.vision} multiline onChange={(v) => set("vision", v)} />
        <Field label="Misi (one per line)" value={missionsText} multiline onChange={setMissionsText} />
      </Section>

      <Section title="Divisions">
        {DIVISIONS.map((code) => (
          <div key={code} className="grid gap-2 sm:grid-cols-[80px_1fr_1.6fr] sm:items-start">
            <p className="text-sm font-bold pt-2">{code}</p>
            <Input placeholder="Full name" value={c.divisions?.[code]?.name ?? ""} onChange={(e) => setDivision(code, "name", e.target.value)} />
            <Textarea rows={2} placeholder="Short description" value={c.divisions?.[code]?.description ?? ""} onChange={(e) => setDivision(code, "description", e.target.value)} />
          </div>
        ))}
      </Section>

      <Section title="Latest updates" hint="Guidebooks, videos, articles. Shown newest first in the order below.">
        {latest.map((item, i) => (
          <div key={item.id} className="grid gap-2 sm:grid-cols-[1.4fr_0.7fr_1.2fr_1.2fr_auto] items-center">
            <Input placeholder="Title" value={item.title} onChange={(e) => setLatest(latest.map((l, j) => (j === i ? { ...l, title: e.target.value } : l)))} />
            <Input placeholder="Kind" value={item.kind} onChange={(e) => setLatest(latest.map((l, j) => (j === i ? { ...l, kind: e.target.value } : l)))} />
            <Input placeholder="Link URL" value={item.url} onChange={(e) => setLatest(latest.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))} />
            <Input placeholder="Image URL" value={item.image} onChange={(e) => setLatest(latest.map((l, j) => (j === i ? { ...l, image: e.target.value } : l)))} />
            <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setLatest(latest.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setLatest([...latest, { id: crypto.randomUUID(), title: "", kind: "", url: "", image: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add item
        </Button>
      </Section>

      <Section title="Contact & links">
        <Field label="Email" value={c.email} onChange={(v) => set("email", v)} />
        <Field label="Dashboard URL" value={c.dashboardUrl} onChange={(v) => set("dashboardUrl", v)} />
        {(["instagram", "youtube", "linkedin", "tiktok"] as const).map((k) => (
          <Field key={k} label={k[0].toUpperCase() + k.slice(1)} value={c.socials?.[k]} onChange={(v) => setNested("socials", k, v)} />
        ))}
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={submit} disabled={save.isPending} className="shadow-card-hover">
          {save.isPending ? "Saving..." : "Save content"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea rows={3} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
