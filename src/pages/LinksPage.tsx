import { useMemo } from "react";
import { useMemberStore } from "@/hooks/useMemberStore";
import { canEditLinks, canSeeRestrictedLinks } from "@/lib/roles";
import { useLinks, useAddLink, useUpdateLink, useDeleteLink } from "@/hooks/useLinks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EditableCell } from "@/components/lapak/EditableCell";
import { Link2, Plus, Trash2, ExternalLink, Lock } from "lucide-react";

export default function LinksPage() {
  const { currentMember, isAdmin } = useMemberStore();
  const { data: links = [], isLoading } = useLinks();
  const add = useAddLink();
  const update = useUpdateLink();
  const del = useDeleteLink();

  const canEdit = canEditLinks(currentMember, isAdmin);
  const canSeeRestricted = canSeeRestrictedLinks(currentMember, isAdmin);

  // Viewers only see public links; Secretary/BPH/Admin also see restricted ones.
  // Editors always see everything so they can manage it.
  const visibleLinks = useMemo(
    () => links.filter((l) => canEdit || canSeeRestricted || !l.restricted),
    [links, canEdit, canSeeRestricted]
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Links</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Shared links for everyone. {canEdit
              ? "You can edit these and mark some as restricted (Secretary/BPH/Admin only)."
              : "Maintained by the Secretary."}
          </p>
        </div>
        {canEdit && (
          <Button className="gap-1.5 shrink-0"
            onClick={() => add.mutate({ label: "", url: "", description: "", restricted: false, sort: links.length })}>
            <Plus className="h-4 w-4" /> Add link
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="border-border/60"><CardContent className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent></Card>
      ) : visibleLinks.length === 0 ? (
        <Card className="border-dashed border-border/60"><CardContent className="py-16 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{canEdit ? 'No links yet. Click "Add link".' : "No links available yet."}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {visibleLinks.map((l) => (
            <Card key={l.id} className="border-border/60">
              <CardContent className="p-3 sm:p-4">
                {canEdit ? (
                  // ----- Editor view: inline editable -----
                  <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.6fr_auto] gap-2 sm:gap-3 items-center">
                    <EditableCell value={l.label} placeholder="Label (e.g. Proposal Template)"
                      onCommit={(label) => update.mutate({ id: l.id, label })} />
                    <EditableCell value={l.url} placeholder="https://…"
                      onCommit={(url) => update.mutate({ id: l.id, url })} />
                    <div className="flex items-center gap-2 justify-end">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Restricted</span>
                        <Switch checked={l.restricted} onCheckedChange={(v) => update.mutate({ id: l.id, restricted: v })} />
                      </label>
                      {l.url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => del.mutate(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ) : (
                  // ----- Reader view -----
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <a href={l.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline truncate">
                          {l.label || l.url || "Untitled link"}
                        </a>
                        {l.restricted && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 text-amber-600 border-amber-300">
                            <Lock className="h-2.5 w-2.5" /> Restricted
                          </Badge>
                        )}
                      </div>
                      {l.description && <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>}
                      {l.url && <p className="text-[11px] text-muted-foreground/70 truncate">{l.url}</p>}
                    </div>
                    {l.url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                        <a href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                )}
                {canEdit && (
                  <div className="mt-2">
                    <EditableCell value={l.description} placeholder="Optional description" multiline
                      onCommit={(description) => update.mutate({ id: l.id, description })} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
