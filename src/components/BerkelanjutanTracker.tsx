import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useBerkelanjutanEntries,
  useAddBerkelanjutanEntry,
  useDeleteBerkelanjutanEntry,
  type BerkelanjutanCategory,
  CATEGORY_LABELS,
} from "@/hooks/useBerkelanjutan";
import {
  useInternalRatings,
  useAddInternalRating,
  useDeleteInternalRating,
  averageInternalRating,
} from "@/hooks/useInternalRatings";
import { useMemberStore } from "@/hooks/useMemberStore";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, Star, TrendingUp, TrendingDown, MessageSquare } from "lucide-react";

interface BerkelanjutanTrackerProps {
  prokerId: string;
  category: BerkelanjutanCategory;
}

// ---------- Finance form ----------
function FinanceEntry({ prokerId }: { prokerId: string }) {
  const addEntry = useAddBerkelanjutanEntry();
  const [f, setF] = useState({ targeted_income: "", actual_income: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
  const submit = async () => {
    try {
      await addEntry.mutateAsync({
        proker_id: prokerId,
        entry_date: f.entry_date,
        targeted_income: f.targeted_income ? Number(f.targeted_income) : null,
        actual_income: f.actual_income ? Number(f.actual_income) : null,
        notes: f.notes || null,
        messages_per_day: null, messages_replied_per_day: null, response_time_minutes: null,
        posts_count: null, total_reach: null, new_followers: null, content_notes: null,
        meals_bought: null, meals_given_out: null, attendees: null, location: null,
      });
      toast.success("Entry added");
      setF({ targeted_income: "", actual_income: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
    } catch {
      toast.error("Failed to add entry");
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div><Label className="text-xs">Date</Label><Input type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></div>
      <div />{/* spacer */}
      <div><Label className="text-xs">Targeted Income (RM)</Label><Input type="number" placeholder="0" value={f.targeted_income} onChange={(e) => setF({ ...f, targeted_income: e.target.value })} /></div>
      <div><Label className="text-xs">Actual Income (RM)</Label><Input type="number" placeholder="0" value={f.actual_income} onChange={(e) => setF({ ...f, actual_income: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional..." /></div>
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending} className="w-full"><Plus className="h-4 w-4 mr-1" />Log Entry</Button></div>
    </div>
  );
}

// ---------- Response form ----------
function ResponseEntry({ prokerId }: { prokerId: string }) {
  const addEntry = useAddBerkelanjutanEntry();
  const [f, setF] = useState({ messages_per_day: "", messages_replied_per_day: "", response_time_minutes: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
  const submit = async () => {
    try {
      await addEntry.mutateAsync({
        proker_id: prokerId,
        entry_date: f.entry_date,
        messages_per_day: f.messages_per_day ? Number(f.messages_per_day) : null,
        messages_replied_per_day: f.messages_replied_per_day ? Number(f.messages_replied_per_day) : null,
        response_time_minutes: f.response_time_minutes ? Number(f.response_time_minutes) : null,
        notes: f.notes || null,
        targeted_income: null, actual_income: null,
        posts_count: null, total_reach: null, new_followers: null, content_notes: null,
        meals_bought: null, meals_given_out: null, attendees: null, location: null,
      });
      toast.success("Entry added");
      setF({ messages_per_day: "", messages_replied_per_day: "", response_time_minutes: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
    } catch {
      toast.error("Failed to add entry");
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Label className="text-xs">Date</Label><Input type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></div>
      <div><Label className="text-xs">Avg Messages/Day</Label><Input type="number" placeholder="0" value={f.messages_per_day} onChange={(e) => setF({ ...f, messages_per_day: e.target.value })} /></div>
      <div><Label className="text-xs">Avg Replied/Day</Label><Input type="number" placeholder="0" value={f.messages_replied_per_day} onChange={(e) => setF({ ...f, messages_replied_per_day: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Avg Response Time (minutes)</Label><Input type="number" placeholder="0" value={f.response_time_minutes} onChange={(e) => setF({ ...f, response_time_minutes: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional..." /></div>
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending} className="w-full"><Plus className="h-4 w-4 mr-1" />Log Entry</Button></div>
    </div>
  );
}

// ---------- Outreach form ----------
function OutreachEntry({ prokerId }: { prokerId: string }) {
  const addEntry = useAddBerkelanjutanEntry();
  const [f, setF] = useState({ posts_count: "", total_reach: "", new_followers: "", content_notes: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
  const submit = async () => {
    try {
      await addEntry.mutateAsync({
        proker_id: prokerId,
        entry_date: f.entry_date,
        posts_count: f.posts_count ? Number(f.posts_count) : null,
        total_reach: f.total_reach ? Number(f.total_reach) : null,
        new_followers: f.new_followers ? Number(f.new_followers) : null,
        content_notes: f.content_notes || null,
        notes: f.notes || null,
        targeted_income: null, actual_income: null,
        messages_per_day: null, messages_replied_per_day: null, response_time_minutes: null,
        meals_bought: null, meals_given_out: null, attendees: null, location: null,
      });
      toast.success("Entry added");
      setF({ posts_count: "", total_reach: "", new_followers: "", content_notes: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
    } catch {
      toast.error("Failed to add entry");
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Label className="text-xs">Date</Label><Input type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></div>
      <div><Label className="text-xs">Posts Count</Label><Input type="number" placeholder="0" value={f.posts_count} onChange={(e) => setF({ ...f, posts_count: e.target.value })} /></div>
      <div><Label className="text-xs">Total Reach</Label><Input type="number" placeholder="0" value={f.total_reach} onChange={(e) => setF({ ...f, total_reach: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">New Followers</Label><Input type="number" placeholder="0" value={f.new_followers} onChange={(e) => setF({ ...f, new_followers: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Content Notes</Label><Textarea rows={2} value={f.content_notes} onChange={(e) => setF({ ...f, content_notes: e.target.value })} placeholder="What was posted..." /></div>
      <div className="col-span-2"><Label className="text-xs">General Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional..." /></div>
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending} className="w-full"><Plus className="h-4 w-4 mr-1" />Log Entry</Button></div>
    </div>
  );
}

// ---------- People form ----------
function PeopleEntry({ prokerId }: { prokerId: string }) {
  const addEntry = useAddBerkelanjutanEntry();
  const [f, setF] = useState({ meals_bought: "", meals_given_out: "", attendees: "", location: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
  const submit = async () => {
    try {
      await addEntry.mutateAsync({
        proker_id: prokerId,
        entry_date: f.entry_date,
        meals_bought: f.meals_bought ? Number(f.meals_bought) : null,
        meals_given_out: f.meals_given_out ? Number(f.meals_given_out) : null,
        attendees: f.attendees ? Number(f.attendees) : null,
        location: f.location || null,
        notes: f.notes || null,
        targeted_income: null, actual_income: null,
        messages_per_day: null, messages_replied_per_day: null, response_time_minutes: null,
        posts_count: null, total_reach: null, new_followers: null, content_notes: null,
      });
      toast.success("Entry added");
      setF({ meals_bought: "", meals_given_out: "", attendees: "", location: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
    } catch {
      toast.error("Failed to add entry");
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Label className="text-xs">Date</Label><Input type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></div>
      <div><Label className="text-xs">Meals Bought</Label><Input type="number" placeholder="0" value={f.meals_bought} onChange={(e) => setF({ ...f, meals_bought: e.target.value })} /></div>
      <div><Label className="text-xs">Meals Given Out</Label><Input type="number" placeholder="0" value={f.meals_given_out} onChange={(e) => setF({ ...f, meals_given_out: e.target.value })} /></div>
      <div><Label className="text-xs">Attendees</Label><Input type="number" placeholder="0" value={f.attendees} onChange={(e) => setF({ ...f, attendees: e.target.value })} /></div>
      <div><Label className="text-xs">Location</Label><Input placeholder="e.g. Masjid UPM" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional..." /></div>
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending} className="w-full"><Plus className="h-4 w-4 mr-1" />Log Entry</Button></div>
    </div>
  );
}

// ---------- Stats summary ----------
function FinanceSummary({ entries }: { entries: ReturnType<typeof useBerkelanjutanEntries>["data"] }) {
  if (!entries?.length) return null;
  const totalTargeted = entries.reduce((s, e) => s + (e.targeted_income ?? 0), 0);
  const totalActual = entries.reduce((s, e) => s + (e.actual_income ?? 0), 0);
  const pct = totalTargeted > 0 ? Math.round((totalActual / totalTargeted) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <StatCard label="Total Targeted" value={`RM ${totalTargeted.toLocaleString()}`} />
      <StatCard label="Total Actual" value={`RM ${totalActual.toLocaleString()}`} icon={totalActual >= totalTargeted ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />} />
      <StatCard label="Achievement" value={`${pct}%`} />
    </div>
  );
}

function ResponseSummary({ entries }: { entries: ReturnType<typeof useBerkelanjutanEntries>["data"] }) {
  if (!entries?.length) return null;
  const avg = (key: keyof typeof entries[0]) => {
    const vals = entries.map((e) => e[key] as number).filter((v) => v != null);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <StatCard label="Avg Msg/Day" value={avg("messages_per_day")} />
      <StatCard label="Avg Replied/Day" value={avg("messages_replied_per_day")} />
      <StatCard label="Avg Response" value={`${avg("response_time_minutes")} min`} />
    </div>
  );
}

function OutreachSummary({ entries }: { entries: ReturnType<typeof useBerkelanjutanEntries>["data"] }) {
  if (!entries?.length) return null;
  const total = (key: keyof typeof entries[0]) => entries.reduce((s, e) => s + ((e[key] as number) ?? 0), 0);
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <StatCard label="Total Posts" value={String(total("posts_count"))} />
      <StatCard label="Total Reach" value={total("total_reach").toLocaleString()} />
      <StatCard label="New Followers" value={String(total("new_followers"))} />
    </div>
  );
}

function PeopleSummary({ entries }: { entries: ReturnType<typeof useBerkelanjutanEntries>["data"] }) {
  if (!entries?.length) return null;
  const total = (key: keyof typeof entries[0]) => entries.reduce((s, e) => s + ((e[key] as number) ?? 0), 0);
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <StatCard label="Meals Bought" value={String(total("meals_bought"))} />
      <StatCard label="Meals Given" value={String(total("meals_given_out"))} />
      <StatCard label="Total People" value={String(total("attendees"))} />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

// ---------- Entry row display ----------
function EntryRow({ entry, category, onDelete, canDelete }: {
  entry: NonNullable<ReturnType<typeof useBerkelanjutanEntries>["data"]>[0];
  category: BerkelanjutanCategory;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">{format(new Date(entry.entry_date), "dd MMM yyyy")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {category === "finance" && (
            <>
              {entry.targeted_income != null && <span className="text-xs">Target: <b>RM {entry.targeted_income.toLocaleString()}</b></span>}
              {entry.actual_income != null && <span className="text-xs">Actual: <b>RM {entry.actual_income.toLocaleString()}</b></span>}
            </>
          )}
          {category === "response" && (
            <>
              {entry.messages_per_day != null && <span className="text-xs">Msg/day: <b>{entry.messages_per_day}</b></span>}
              {entry.messages_replied_per_day != null && <span className="text-xs">Replied/day: <b>{entry.messages_replied_per_day}</b></span>}
              {entry.response_time_minutes != null && <span className="text-xs">Response: <b>{entry.response_time_minutes} min</b></span>}
            </>
          )}
          {category === "outreach" && (
            <>
              {entry.posts_count != null && <span className="text-xs">Posts: <b>{entry.posts_count}</b></span>}
              {entry.total_reach != null && <span className="text-xs">Reach: <b>{entry.total_reach.toLocaleString()}</b></span>}
              {entry.new_followers != null && <span className="text-xs">+Followers: <b>{entry.new_followers}</b></span>}
            </>
          )}
          {category === "people" && (
            <>
              {entry.meals_bought != null && <span className="text-xs">Bought: <b>{entry.meals_bought}</b></span>}
              {entry.meals_given_out != null && <span className="text-xs">Given: <b>{entry.meals_given_out}</b></span>}
              {entry.attendees != null && <span className="text-xs">People: <b>{entry.attendees}</b></span>}
              {entry.location && <span className="text-xs text-muted-foreground">{entry.location}</span>}
            </>
          )}
        </div>
        {entry.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.notes}</p>}
        {category === "outreach" && entry.content_notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.content_notes}</p>}
      </div>
      {canDelete && (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" aria-label="Delete entry" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ---------- Peer Ratings panel ----------
function PeerRatingsPanel({ prokerId }: { prokerId: string }) {
  const { data: ratings = [] } = useInternalRatings(prokerId);
  const addRating = useAddInternalRating();
  const deleteRating = useDeleteInternalRating();
  const { currentMember, isAdmin } = useMemberStore();
  const [ratingVal, setRatingVal] = useState(0);
  const [hover, setHover] = useState(0);
  const [notes, setNotes] = useState("");

  const submit = async () => {
    if (!ratingVal) { toast.error("Select a rating"); return; }
    await addRating.mutateAsync({
      proker_id: prokerId,
      rater_name: currentMember?.name ?? "Anonymous",
      rater_division: currentMember?.division ?? "—",
      overall_rating: ratingVal,
      notes: notes.trim() || null,
    });
    toast.success("Rating submitted!");
    setRatingVal(0); setNotes("");
  };

  const avg = averageInternalRating(ratings);

  return (
    <div className="space-y-3">
      {avg > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Peer Avg: {avg}/5</span>
          <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">{ratings.length} ratings</Badge>
        </div>
      )}

      {ratings.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {ratings.map((r) => (
            <div key={r.id} className="flex items-start justify-between bg-muted/40 rounded-lg px-3 py-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">{r.rater_name}</span>
                  <Badge variant="secondary" className="text-[10px] py-0">{r.rater_division}</Badge>
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-3 w-3 ${s <= r.overall_rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), "dd MMM")}</span>
                </div>
                {r.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{r.notes}</p>}
              </div>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" aria-label={`Delete rating by ${r.rater_name}`} onClick={() => deleteRating.mutate({ id: r.id, prokerId })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Separator />
      <p className="text-xs font-medium text-muted-foreground">Submit Peer Rating</p>
      <div className="flex gap-1">
        {[1,2,3,4,5].map((s) => (
          <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRatingVal(s)}>
            <Star className={`h-6 w-6 transition-colors ${s <= (hover || ratingVal) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
        {ratingVal > 0 && <span className="text-sm font-medium ml-1 self-center">{ratingVal}/5</span>}
      </div>
      <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comments (optional)..." />
      <Button onClick={submit} disabled={!ratingVal || addRating.isPending} className="w-full">Submit Rating</Button>
    </div>
  );
}

// ---------- Main component ----------
export function BerkelanjutanTracker({ prokerId, category }: BerkelanjutanTrackerProps) {
  const { data: entries = [], isLoading } = useBerkelanjutanEntries(prokerId);
  const deleteEntry = useDeleteBerkelanjutanEntry();
  const { isAdmin } = useMemberStore();
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string) => {
    await deleteEntry.mutateAsync({ id, proker_id: prokerId });
    toast.success("Entry removed");
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{CATEGORY_LABELS[category]} — Tracker</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {showForm ? "Cancel" : "Log Entry"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Category stats */}
          {category === "finance" && <FinanceSummary entries={entries} />}
          {category === "response" && <ResponseSummary entries={entries} />}
          {category === "outreach" && <OutreachSummary entries={entries} />}
          {category === "people" && <PeopleSummary entries={entries} />}

          {/* Entry form */}
          {showForm && (
            <>
              <Separator />
              <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Entry</p>
                {category === "finance" && <FinanceEntry prokerId={prokerId} />}
                {category === "response" && <ResponseEntry prokerId={prokerId} />}
                {category === "outreach" && <OutreachEntry prokerId={prokerId} />}
                {category === "people" && <PeopleEntry prokerId={prokerId} />}
              </div>
            </>
          )}

          {/* Entry list */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No entries yet. Log the first one!</p>
          ) : (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">History ({entries.length})</p>
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  category={category}
                  canDelete={isAdmin}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Internal peer ratings */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Peer Ratings</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <PeerRatingsPanel prokerId={prokerId} />
        </CardContent>
      </Card>
    </div>
  );
}
