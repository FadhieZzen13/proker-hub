import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Pencil, Trash2, CheckCircle2, Eye, Star, Activity, MessageSquare, Repeat2 } from "lucide-react";
import { EMPTY_PROKER_ZONE, type Proker, type ProkerCurrentZone, type ProkerZone, useDeleteProker, useUpdateProker } from "@/hooks/useProkers";
import { useProkerAnalytics } from "@/hooks/useProkerAnalytics";
import { useInternalRatings, useAddInternalRating, useDeleteInternalRating, averageInternalRating } from "@/hooks/useInternalRatings";
import { CompletionForm } from "@/components/CompletionForm";
import { PromotionForm } from "@/components/PromotionForm";
import { EngagementForm } from "@/components/EngagementForm";
import { RatingForm } from "@/components/RatingForm";
import { BerkelanjutanTracker } from "@/components/BerkelanjutanTracker";
import { computeOverallRating, type PromotionData, type EngagementData, type RatingData } from "@/hooks/useProkerAnalytics";
import { useMemberStore } from "@/hooks/useMemberStore";
import { CATEGORY_LABELS, useBerkelanjutanEntries, type BerkelanjutanCategory } from "@/hooks/useBerkelanjutan";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProkerDetailProps {
  proker: Proker | null;
  creatorName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (proker: Proker) => void;
}

export function ProkerDetail({ proker, creatorName, open, onOpenChange, onEdit }: ProkerDetailProps) {
  const [showCompletion, setShowCompletion] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const deleteMutation = useDeleteProker();
  const updateMutation = useUpdateProker();
  const { analytics, updateAllAnalytics } = useProkerAnalytics(proker);
  const { data: internalRatings = [] } = useInternalRatings(proker?.id ?? "");
  const addRating = useAddInternalRating();
  const deleteRating = useDeleteInternalRating();
  const { currentMember, isAdmin } = useMemberStore();
  const [deleteConfirmPending, setDeleteConfirmPending] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingAnalytics, setSavingAnalytics] = useState(false);
  const [zoneDrafts, setZoneDrafts] = useState<{
    current_zone: ProkerCurrentZone;
    red_zone: ProkerZone;
    medium_zone: ProkerZone;
    green_zone: ProkerZone;
  }>({
    current_zone: "green",
    red_zone: { ...EMPTY_PROKER_ZONE },
    medium_zone: { ...EMPTY_PROKER_ZONE },
    green_zone: { ...EMPTY_PROKER_ZONE },
  });
  const [zonesDirty, setZonesDirty] = useState(false);
  const [savingZones, setSavingZones] = useState(false);

  // Track latest form values from all three analytics forms
  const promoRef = useRef<PromotionData | null>(null);
  const engageRef = useRef<EngagementData | null>(null);
  const ratingRef = useRef<RatingData | null>(null);
  const [analyticsDirty, setAnalyticsDirty] = useState(false);

  // Internal rating form state
  const [peerRatingValue, setPeerRatingValue] = useState<number>(0);
  const [peerRatingNotes, setPeerRatingNotes] = useState("");
  const [peerHover, setPeerHover] = useState(0);

  useEffect(() => {
    setDeleteConfirmPending(false);
    setAnalyticsDirty(false);
    promoRef.current = null;
    engageRef.current = null;
    ratingRef.current = null;
    setZoneDrafts({
      current_zone: proker?.current_zone ?? "green",
      red_zone: proker?.red_zone ?? { ...EMPTY_PROKER_ZONE },
      medium_zone: proker?.medium_zone ?? { ...EMPTY_PROKER_ZONE },
      green_zone: proker?.green_zone ?? { ...EMPTY_PROKER_ZONE },
    });
    setZonesDirty(false);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, [open, proker?.id]);

  if (!proker) return null;

  const handleDelete = async () => {
    if (!deleteConfirmPending) {
      setDeleteConfirmPending(true);
      deleteTimerRef.current = setTimeout(() => setDeleteConfirmPending(false), 3000);
      return;
    }
    setDeleteConfirmPending(false);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    await deleteMutation.mutateAsync(proker.id);
    toast.success("Proker deleted");
    onOpenChange(false);
  };

  const handleSaveNotes = async () => {
    await updateMutation.mutateAsync({ id: proker.id, notes: notesValue });
    toast.success("Notes updated");
    setEditingNotes(false);
  };

  const startEditNotes = () => {
    setNotesValue(proker.notes || "");
    setEditingNotes(true);
  };

  const handleAddPeerRating = async () => {
    if (!peerRatingValue) {
      toast.error("Please select a rating");
      return;
    }
    const raterName = currentMember?.name ?? "Anonymous";
    const raterDivision = currentMember?.division ?? "—";
    await addRating.mutateAsync({
      proker_id: proker.id,
      rater_name: raterName,
      rater_division: raterDivision,
      overall_rating: peerRatingValue,
      notes: peerRatingNotes.trim() || null,
    });
    toast.success("Rating submitted!");
    setPeerRatingValue(0);
    setPeerRatingNotes("");
  };

  const handleSaveAllAnalytics = async () => {
    if (!proker || !analytics) return;
    setSavingAnalytics(true);
    try {
      await updateAllAnalytics(
        proker.id,
        promoRef.current ?? analytics.promotion,
        engageRef.current ?? analytics.engagement,
        ratingRef.current ?? analytics.rating,
      );
      toast.success("All analytics saved!");
      setAnalyticsDirty(false);
    } catch {
      toast.error("Failed to save analytics");
    } finally {
      setSavingAnalytics(false);
    }
  };

  const updateZoneField = (
    zoneKey: "red_zone" | "medium_zone" | "green_zone",
    field: keyof ProkerZone,
    value: string | null
  ) => {
    setZoneDrafts((prev) => ({
      ...prev,
      [zoneKey]: {
        ...prev[zoneKey],
        [field]: value,
      },
    }));
    setZonesDirty(true);
  };

  const handleSaveZones = async () => {
    setSavingZones(true);
    try {
      await updateMutation.mutateAsync({
        id: proker.id,
        current_zone: zoneDrafts.current_zone,
        red_zone: zoneDrafts.red_zone,
        medium_zone: zoneDrafts.medium_zone,
        green_zone: zoneDrafts.green_zone,
      });
      toast.success("Progress zones saved");
      setZonesDirty(false);
    } catch {
      toast.error("Failed to save progress zones");
    } finally {
      setSavingZones(false);
    }
  };

  const selfAndInternalRating = computeOverallRating(analytics?.rating ?? {
    planning: 0, execution: 0, impact: 0, creativity: 0, teamwork: 0,
  });
  const peerAvg = averageInternalRating(internalRatings);

  const divisionLabel = proker.collab_divisions?.length
    ? `${proker.division} + ${proker.collab_divisions.join(", ")}`
    : `${proker.division} Division`;

  // Permission: only the creator (or admin) can edit/delete
  const isCreator = !!currentMember && !!proker.created_by_member_id && currentMember.id === proker.created_by_member_id;
  // Legacy prokers without created_by_member_id: allow editing by anyone in that division
  const isLegacy = !proker.created_by_member_id;
  const canEdit = isAdmin || isCreator || isLegacy;
  const canDelete = isAdmin || isCreator;
  const canEditZones = canEdit && proker.status === "active";
  const currentZoneKey = `${zoneDrafts.current_zone}_zone` as "red_zone" | "medium_zone" | "green_zone";
  const currentZone = zoneDrafts[currentZoneKey];
  const zoneMeta: Record<ProkerCurrentZone, { label: string; toneClass: string; badgeClass: string }> = {
    red: { label: "Red Zone", toneClass: "text-red-600", badgeClass: "bg-red-500/10 text-red-600 border-red-200" },
    medium: { label: "Medium Zone", toneClass: "text-amber-600", badgeClass: "bg-amber-500/10 text-amber-700 border-amber-200" },
    green: { label: "Green Zone", toneClass: "text-emerald-600", badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  };

  // For berkelanjutan prokers, determine which tabs to show based on category
  // outreach -> show Promotion (platform reach); people/training -> show Engagement (attendance)
  // finance & response -> hide both Promotion & Engagement (tracker has all relevant metrics)
  const showPromoTab = !proker.is_berkelanjutan || proker.berkelanjutan_category === "outreach";
  const showEngageTab = !proker.is_berkelanjutan || proker.berkelanjutan_category === "people" || proker.berkelanjutan_category === "training";

  // Count visible tabs for grid layout
  const tabCount = 3 + (showPromoTab ? 1 : 0) + (showEngageTab ? 1 : 0) + (proker.is_berkelanjutan ? 1 : 0);

  return (
    <>
      <Dialog open={open && !showCompletion} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl text-foreground">{proker.nama_proker}</DialogTitle>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">{divisionLabel}</p>
                  {proker.is_berkelanjutan && (
                    <Badge variant="outline" className="gap-1 text-xs border-blue-300 text-blue-600">
                      <Repeat2 className="h-3 w-3" /> Berkelanjutan
                    </Badge>
                  )}
                  {selfAndInternalRating > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {selfAndInternalRating}/5
                    </Badge>
                  )}
                  {peerAvg > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs border-purple-300 text-purple-600">
                      <Star className="h-3 w-3 fill-purple-400 text-purple-400" />
                      {peerAvg} internal ({internalRatings.length})
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {proker.status === "active" && canEdit && (
                  <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(proker); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" variant={deleteConfirmPending ? "destructive" : "outline"} onClick={handleDelete} className={deleteConfirmPending ? "animate-pulse" : ""}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {deleteConfirmPending ? "Confirm Delete" : "Delete"}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="mt-2">
            <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {showPromoTab && (
                <TabsTrigger value="promotion" className="gap-1">
                  <Eye className="h-3 w-3" /> Promo
                </TabsTrigger>
              )}
              {showEngageTab && (
                <TabsTrigger value="engagement" className="gap-1">
                  <Activity className="h-3 w-3" /> Engage
                </TabsTrigger>
              )}
              <TabsTrigger value="rating" className="gap-1">
                <Star className="h-3 w-3" /> Rating
              </TabsTrigger>
              <TabsTrigger value="peer" className="gap-1">
                <Star className="h-3 w-3" /> Internal
              </TabsTrigger>
              {proker.is_berkelanjutan && (
                <TabsTrigger value="tracker" className="gap-1">
                  <Repeat2 className="h-3 w-3" /> Tracker
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-5 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoItem icon={<Calendar className="h-4 w-4" />} label="Date" value={format(new Date(proker.tanggal), "dd MMM yyyy")} />
                {proker.is_berkelanjutan ? (
                  <InfoItem
                    icon={<Repeat2 className="h-4 w-4" />}
                    label="Category"
                    value={
                      proker.berkelanjutan_category
                        ? CATEGORY_LABELS[proker.berkelanjutan_category as BerkelanjutanCategory]
                        : "Not set"
                    }
                  />
                ) : (
                  <InfoItem icon={<Users className="h-4 w-4" />} label="Target" value={`${proker.target_peserta} peserta`} />
                )}
                <InfoItem label="Type" value={<Badge variant={proker.type === "Internal" ? "default" : "secondary"} className={proker.type === "Internal" ? "bg-primary text-primary-foreground" : ""}>{proker.type}</Badge>} />
                <InfoItem label="Status" value={
                  proker.is_berkelanjutan
                    ? <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Ongoing</Badge>
                    : <Badge className={proker.status === "complete" ? "bg-green-500/10 text-green-600 border-green-200" : "bg-primary/10 text-primary border-primary/20"}>
                        {proker.status === "complete" ? "Complete" : "Active"}
                      </Badge>
                } />
                <InfoItem icon={<Users className="h-4 w-4" />} label="Created By" value={creatorName ?? "Unknown member"} />
              </div>

              {/* Collab divisions */}
              {proker.collab_divisions?.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Collaboration With</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {proker.collab_divisions.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {proker.is_berkelanjutan ? (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Status</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 h-2.5 rounded-full bg-blue-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400 animate-pulse" style={{ width: "100%" }} />
                    </div>
                    <span className="text-sm font-bold text-blue-600">Ongoing</span>
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Progress</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${proker.progress}%` }} />
                    </div>
                    <span className="text-sm font-bold text-foreground">{proker.progress}%</span>
                  </div>
                </div>
              )}

              {proker.description && (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description</Label>
                  <p className="text-sm text-foreground mt-1">{proker.description}</p>
                </div>
              )}

              {proker.status === "active" && (
                <div className="space-y-3 rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Progress Zones</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Current zone only: Red (most dangerous), Medium, or Green (safe).</p>
                    </div>
                    {canEditZones && zonesDirty && (
                      <Button size="sm" onClick={handleSaveZones} disabled={savingZones}>
                        {savingZones ? "Saving..." : "Save Zones"}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={zoneMeta[zoneDrafts.current_zone].badgeClass}>{zoneMeta[zoneDrafts.current_zone].label}</Badge>
                    {canEditZones ? (
                      <Select
                        value={zoneDrafts.current_zone}
                        onValueChange={(v) => {
                          setZoneDrafts((prev) => ({ ...prev, current_zone: v as ProkerCurrentZone }));
                          setZonesDirty(true);
                        }}
                      >
                        <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="red">Red Zone</SelectItem>
                          <SelectItem value="medium">Medium Zone</SelectItem>
                          <SelectItem value="green">Green Zone</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>

                  <ZoneDetailCard
                    title={zoneMeta[zoneDrafts.current_zone].label}
                    toneClass={zoneMeta[zoneDrafts.current_zone].toneClass}
                    zone={currentZone}
                    editable={canEditZones}
                    onChange={(field, value) => updateZoneField(currentZoneKey, field, value)}
                  />
                </div>
              )}

              {proker.is_berkelanjutan && proker.berkelanjutan_notes && (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Berkelanjutan Notes</Label>
                  <p className="text-sm text-foreground mt-1">{proker.berkelanjutan_notes}</p>
                </div>
              )}

              {/* Quick Analytics Summary — different for berkelanjutan */}
              {proker.is_berkelanjutan && proker.berkelanjutan_category ? (
                <BerkelanjutanMiniSummary prokerId={proker.id} category={proker.berkelanjutan_category as BerkelanjutanCategory} />
              ) : analytics ? (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <Eye className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                    <p className="text-lg font-bold text-foreground">{analytics.promotion.views}</p>
                    <p className="text-[10px] text-muted-foreground">Promo Views</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <Activity className="h-4 w-4 mx-auto text-green-500 mb-1" />
                    <p className="text-lg font-bold text-foreground">{analytics.engagement.attendance_rate}%</p>
                    <p className="text-[10px] text-muted-foreground">Attendance</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <Star className="h-4 w-4 mx-auto text-yellow-400 fill-yellow-400 mb-1" />
                    <p className="text-lg font-bold text-foreground">{selfAndInternalRating > 0 ? selfAndInternalRating : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Rating</p>
                  </div>
                </div>
              ) : null}

              {proker.status === "active" && !proker.is_berkelanjutan && (
                <Button className="w-full bg-green-600 hover:bg-green-700 text-primary-foreground" onClick={() => setShowCompletion(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Complete
                </Button>
              )}

              {proker.status === "complete" && (
                <>
                  <Separator />
                  <h3 className="font-semibold text-foreground">Completion Report</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Predicted Peserta" value={`${proker.target_peserta}`} />
                    <InfoItem label="Actual Peserta" value={`${proker.actual_peserta ?? "-"}`} />
                  </div>
                  {proker.success_factors && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Success Factors</Label>
                      <p className="text-sm text-foreground mt-1">{proker.success_factors}</p>
                    </div>
                  )}
                  {proker.improvements && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Improvements</Label>
                      <p className="text-sm text-foreground mt-1">{proker.improvements}</p>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Notes</Label>
                      <Button size="sm" variant="ghost" onClick={startEditNotes} className="text-xs h-6">
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                    {editingNotes ? (
                      <div className="mt-1 space-y-2">
                        <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} rows={3} />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground mt-1">{proker.notes || "No notes yet."}</p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {showPromoTab && (
              <TabsContent value="promotion" className="mt-4">
                {analytics && (
                  <PromotionForm
                    data={promoRef.current ?? analytics.promotion}
                    hideSaveButton
                    onChange={(data) => { promoRef.current = data; setAnalyticsDirty(true); }}
                  />
                )}
              </TabsContent>
            )}

            {showEngageTab && (
              <TabsContent value="engagement" className="mt-4">
                {analytics && (
                  <EngagementForm
                    data={engageRef.current ?? analytics.engagement}
                    hideSaveButton
                    onChange={(data) => { engageRef.current = data; setAnalyticsDirty(true); }}
                  />
                )}
              </TabsContent>
            )}

            <TabsContent value="rating" className="mt-4">
              {analytics && (
                <RatingForm
                  data={ratingRef.current ?? analytics.rating}
                  hideSaveButton
                  onChange={(data) => { ratingRef.current = data; setAnalyticsDirty(true); }}
                />
              )}
            </TabsContent>

            {/* Internal Ratings tab */}
            <TabsContent value="peer" className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 fill-purple-400 text-purple-400" /> Internal Ratings
                  {peerAvg > 0 && (
                    <span className="ml-auto text-sm font-bold text-purple-600">
                      <Star className="h-3.5 w-3.5 fill-purple-400 text-purple-400 inline mr-1" />
                      {peerAvg} / 5.0 avg
                    </span>
                  )}
                </p>

                {/* Existing ratings list */}
                {internalRatings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No internal ratings yet. Be the first to rate!</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {internalRatings.map((r) => (
                      <div key={r.id} className="flex items-start justify-between rounded-lg border border-border/60 p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{r.rater_name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{r.rater_division}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-3.5 w-3.5 ${s <= r.overall_rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{r.overall_rating}/5</span>
                          </div>
                          {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                          <p className="text-[10px] text-muted-foreground/60">
                            {format(new Date(r.created_at), "dd MMM yyyy, HH:mm")}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            aria-label={`Delete rating by ${r.rater_name}`}
                            onClick={() => deleteRating.mutateAsync({ id: r.id, prokerId: proker.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Add internal rating form */}
                <div className="pt-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rate this Proker {currentMember ? `as ${currentMember.name} (${currentMember.division})` : ""}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} out of 5 stars`}
                        className="focus:outline-none transition-transform hover:scale-110"
                        onMouseEnter={() => setPeerHover(star)}
                        onMouseLeave={() => setPeerHover(0)}
                        onClick={() => setPeerRatingValue(star === peerRatingValue ? 0 : star)}
                      >
                        <Star className={`h-7 w-7 transition-colors ${star <= (peerHover || peerRatingValue) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                      </button>
                    ))}
                    {peerRatingValue > 0 && <span className="text-sm font-bold ml-2 text-foreground">{peerRatingValue}/5</span>}
                  </div>
                  <div>
                    {!currentMember && (
                      <p className="text-xs text-muted-foreground italic">Log in to include your name and division with your rating.</p>
                    )}
                  </div>
                  <Textarea
                    value={peerRatingNotes}
                    onChange={(e) => setPeerRatingNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                  />
                  <Button
                    className="w-full"
                    onClick={handleAddPeerRating}
                    disabled={!peerRatingValue || addRating.isPending}
                  >
                    Submit Internal Rating
                  </Button>
                </div>
              </div>
            </TabsContent>
            {/* Berkelanjutan Tracker tab */}
            {proker.is_berkelanjutan && (
              <TabsContent value="tracker" className="mt-4">
                {proker.berkelanjutan_category ? (
                  <BerkelanjutanTracker
                    prokerId={proker.id}
                    category={proker.berkelanjutan_category as BerkelanjutanCategory}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Repeat2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No tracker category set.</p>
                    <p className="text-xs mt-1">Edit this proker and select a Berkelanjutan Category.</p>
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  {proker.berkelanjutan_category && (
                    <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[proker.berkelanjutan_category as BerkelanjutanCategory]}</Badge>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Unified Save Analytics Button */}
          {analyticsDirty && (
            <div className="sticky bottom-0 pt-3 pb-1 bg-background border-t border-border/60 mt-4">
              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={handleSaveAllAnalytics}
                disabled={savingAnalytics}
              >
                {savingAnalytics ? "Saving..." : "Save All Analytics"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CompletionForm
        key={proker.id}
        proker={proker}
        open={showCompletion}
        onOpenChange={setShowCompletion}
        onComplete={() => { setShowCompletion(false); onOpenChange(false); }}
      />
    </>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ZoneDetailCard({
  title,
  toneClass,
  zone,
  editable,
  onChange,
}: {
  title: string;
  toneClass: string;
  zone: ProkerZone;
  editable: boolean;
  onChange: (field: keyof ProkerZone, value: string | null) => void;
}) {
  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wider ${toneClass}`}>{title}</p>
      <Input
        value={zone.current_status}
        onChange={(e) => onChange("current_status", e.target.value)}
        placeholder="Current status"
        readOnly={!editable}
        className={!editable ? "bg-muted" : ""}
      />
      <Textarea
        value={zone.current_problem}
        onChange={(e) => onChange("current_problem", e.target.value)}
        placeholder="Current problem"
        rows={2}
        readOnly={!editable}
        className={!editable ? "bg-muted" : ""}
      />
      <Textarea
        value={zone.way_out}
        onChange={(e) => onChange("way_out", e.target.value)}
        placeholder="Way out"
        rows={2}
        readOnly={!editable}
        className={!editable ? "bg-muted" : ""}
      />
      <Textarea
        value={zone.action_needed}
        onChange={(e) => onChange("action_needed", e.target.value)}
        placeholder="What needs to be done"
        rows={2}
        readOnly={!editable}
        className={!editable ? "bg-muted" : ""}
      />
      <Input
        type="date"
        value={zone.deadline ? zone.deadline.slice(0, 10) : ""}
        onChange={(e) => onChange("deadline", e.target.value || null)}
        readOnly={!editable}
        className={!editable ? "bg-muted" : ""}
      />
    </div>
  );
}

function BerkelanjutanMiniSummary({ prokerId, category }: { prokerId: string; category: BerkelanjutanCategory }) {
  const { data: entries = [] } = useBerkelanjutanEntries(prokerId);
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-center text-sm text-muted-foreground">
        No tracker entries yet. Go to the <span className="font-medium text-blue-600">Tracker</span> tab to add data.
      </div>
    );
  }
  if (category === "finance") {
    const totalTarget = entries.reduce((s, e) => s + (e.targeted_income ?? 0), 0);
    const totalActual = entries.reduce((s, e) => s + (e.actual_income ?? 0), 0);
    const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
    return (
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
          <p className="text-lg font-bold text-green-700">RM {totalTarget.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Target Income</p>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
          <p className="text-lg font-bold text-blue-700">RM {totalActual.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Actual Income</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{pct}%</p>
          <p className="text-[10px] text-muted-foreground">Achievement</p>
        </div>
      </div>
    );
  }
  if (category === "response") {
    const msgPerDay = entries.map((e) => e.messages_per_day).filter((v): v is number => v != null);
    const repliedPerDay = entries.map((e) => e.messages_replied_per_day).filter((v): v is number => v != null);
    const respTime = entries.map((e) => e.response_time_minutes).filter((v): v is number => v != null);
    const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "—";
    return (
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-center">
          <p className="text-lg font-bold text-purple-700">{avg(msgPerDay)}</p>
          <p className="text-[10px] text-muted-foreground">Msgs/Day Avg</p>
        </div>
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-center">
          <p className="text-lg font-bold text-indigo-700">{avg(repliedPerDay)}</p>
          <p className="text-[10px] text-muted-foreground">Replied/Day Avg</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{avg(respTime)} min</p>
          <p className="text-[10px] text-muted-foreground">Response Time</p>
        </div>
      </div>
    );
  }
  if (category === "outreach") {
    const posts = entries.reduce((s, e) => s + (e.posts_count ?? 0), 0);
    const reach = entries.reduce((s, e) => s + (e.total_reach ?? 0), 0);
    const followers = entries.reduce((s, e) => s + (e.new_followers ?? 0), 0);
    return (
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="rounded-lg bg-pink-50 border border-pink-200 p-3 text-center">
          <p className="text-lg font-bold text-pink-700">{posts}</p>
          <p className="text-[10px] text-muted-foreground">Total Posts</p>
        </div>
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-center">
          <p className="text-lg font-bold text-orange-700">{reach.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Reach</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-lg font-bold text-foreground">+{followers}</p>
          <p className="text-[10px] text-muted-foreground">New Followers</p>
        </div>
      </div>
    );
  }
  if (category === "training") {
    const totalTarget = entries.reduce((s, e) => s + (e.target_audience ?? 0), 0);
    const totalActual = entries.reduce((s, e) => s + (e.actual_audience ?? 0), 0);
    const satScores = entries.map((e) => e.satisfaction_score).filter((v): v is number => v != null);
    const avgSat = satScores.length ? (satScores.reduce((a, b) => a + b, 0) / satScores.length).toFixed(1) : "—";
    const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
    return (
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="rounded-lg bg-teal-50 border border-teal-200 p-3 text-center">
          <p className="text-lg font-bold text-teal-700">{totalActual}/{totalTarget}</p>
          <p className="text-[10px] text-muted-foreground">Audience ({pct}%)</p>
        </div>
        <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-center">
          <p className="text-lg font-bold text-cyan-700">{entries.length}</p>
          <p className="text-[10px] text-muted-foreground">Sessions</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{avgSat}/5</p>
          <p className="text-[10px] text-muted-foreground">Satisfaction</p>
        </div>
      </div>
    );
  }
  // people
  const bought = entries.reduce((s, e) => s + (e.meals_bought ?? 0), 0);
  const given = entries.reduce((s, e) => s + (e.meals_given_out ?? 0), 0);
  const attendees = entries.reduce((s, e) => s + (e.attendees ?? 0), 0);
  return (
    <div className="grid grid-cols-3 gap-3 pt-2">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
        <p className="text-lg font-bold text-amber-700">{bought}</p>
        <p className="text-[10px] text-muted-foreground">Meals Bought</p>
      </div>
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
        <p className="text-lg font-bold text-emerald-700">{given}</p>
        <p className="text-[10px] text-muted-foreground">Meals Given</p>
      </div>
      <div className="rounded-lg bg-muted/50 p-3 text-center">
        <p className="text-lg font-bold text-foreground">{attendees}</p>
        <p className="text-[10px] text-muted-foreground">Attendees</p>
      </div>
    </div>
  );
}