import { useEffect, useState } from "react";
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
  useUpdateBerkelanjutanEntry,
  type BerkelanjutanEntry,
  type BerkelanjutanCategory,
  CATEGORY_LABELS,
} from "@/hooks/useBerkelanjutan";
import {
  useInternalRatings,
  useAddInternalRating,
  useDeleteInternalRating,
  averageInternalRating,
} from "@/hooks/useInternalRatings";
import {
  useOngoingComments,
  useAddOngoingComment,
  useDeleteOngoingComment,
} from "@/hooks/useOngoingComments";
import { useMemberStore } from "@/hooks/useMemberStore";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, Star, TrendingUp, TrendingDown, MessageSquare, ChevronLeft, ChevronRight, GraduationCap, Pencil, Check } from "lucide-react";
import { pushDashboardNotification } from "@/hooks/useDashboardNotifications";

const HISTORY_PAGE_SIZE = 10;

interface BerkelanjutanTrackerProps {
  prokerId: string;
  category: BerkelanjutanCategory;
  prokerName?: string;
  division?: string;
}

// ---------- Finance form ----------
function FinanceEntry({
  prokerId,
  initialEntry,
  onSubmitted,
}: {
  prokerId: string;
  initialEntry?: BerkelanjutanEntry | null;
  onSubmitted?: () => void;
}) {
  const addEntry = useAddBerkelanjutanEntry();
  const updateEntry = useUpdateBerkelanjutanEntry();
  const [f, setF] = useState({ targeted_income: "", actual_income: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    setF({
      targeted_income: initialEntry?.targeted_income != null ? String(initialEntry.targeted_income) : "",
      actual_income: initialEntry?.actual_income != null ? String(initialEntry.actual_income) : "",
      notes: initialEntry?.notes ?? "",
      entry_date: initialEntry?.entry_date ?? new Date().toISOString().split("T")[0],
    });
  }, [initialEntry]);

  const submit = async () => {
    try {
      const payload = {
        proker_id: prokerId,
        entry_date: f.entry_date,
        targeted_income: f.targeted_income ? Number(f.targeted_income) : null,
        actual_income: f.actual_income ? Number(f.actual_income) : null,
        notes: f.notes || null,
        messages_per_day: null, messages_replied_per_day: null, response_time_minutes: null,
        posts_count: null, total_reach: null, new_followers: null, content_notes: null,
        meals_bought: null, meals_given_out: null, attendees: null, location: null,
        school_visited: null, participants_count: null, ppi_members_attendance: null, visit_datetime: null,
        topic: null, speaker: null, target_audience: null, actual_audience: null, duration_minutes: null, satisfaction_score: null, training_notes: null,
      };
      if (initialEntry?.id) {
        await updateEntry.mutateAsync({ id: initialEntry.id, ...payload });
        toast.success("Entry updated");
      } else {
        await addEntry.mutateAsync(payload);
        toast.success("Entry added");
      }
      setF({ targeted_income: "", actual_income: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
      onSubmitted?.();
    } catch {
      toast.error(initialEntry?.id ? "Failed to update entry" : "Failed to add entry");
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div><Label className="text-xs">Date</Label><Input type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></div>
      <div />{/* spacer */}
      <div><Label className="text-xs">Targeted Income (RM)</Label><Input type="number" placeholder="0" value={f.targeted_income} onChange={(e) => setF({ ...f, targeted_income: e.target.value })} /></div>
      <div><Label className="text-xs">Actual Income (RM)</Label><Input type="number" placeholder="0" value={f.actual_income} onChange={(e) => setF({ ...f, actual_income: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional..." /></div>
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending || updateEntry.isPending} className="w-full">{initialEntry?.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}{initialEntry?.id ? "Save Entry" : "Log Entry"}</Button></div>
    </div>
  );
}

// ---------- Response form ----------
function ResponseEntry({
  prokerId,
  initialEntry,
  onSubmitted,
}: {
  prokerId: string;
  initialEntry?: BerkelanjutanEntry | null;
  onSubmitted?: () => void;
}) {
  const addEntry = useAddBerkelanjutanEntry();
  const updateEntry = useUpdateBerkelanjutanEntry();
  const [f, setF] = useState({
    messages_per_day: "",
    messages_replied_per_day: "",
    response_time_minutes: "",
    school_visited: "",
    participants_count: "",
    ppi_members_attendance: "",
    visit_datetime: "",
    notes: "",
    entry_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    setF({
      messages_per_day: initialEntry?.messages_per_day != null ? String(initialEntry.messages_per_day) : "",
      messages_replied_per_day: initialEntry?.messages_replied_per_day != null ? String(initialEntry.messages_replied_per_day) : "",
      response_time_minutes: initialEntry?.response_time_minutes != null ? String(initialEntry.response_time_minutes) : "",
      school_visited: initialEntry?.school_visited ?? "",
      participants_count: initialEntry?.participants_count != null ? String(initialEntry.participants_count) : "",
      ppi_members_attendance: initialEntry?.ppi_members_attendance != null ? String(initialEntry.ppi_members_attendance) : "",
      visit_datetime: initialEntry?.visit_datetime ? initialEntry.visit_datetime.slice(0, 16) : "",
      notes: initialEntry?.notes ?? "",
      entry_date: initialEntry?.entry_date ?? new Date().toISOString().split("T")[0],
    });
  }, [initialEntry]);

  const submit = async () => {
    try {
      const entryDate = f.visit_datetime ? f.visit_datetime.split("T")[0] : f.entry_date;
      const payload = {
        proker_id: prokerId,
        entry_date: entryDate,
        messages_per_day: f.messages_per_day ? Number(f.messages_per_day) : null,
        messages_replied_per_day: f.messages_replied_per_day ? Number(f.messages_replied_per_day) : null,
        response_time_minutes: f.response_time_minutes ? Number(f.response_time_minutes) : null,
        school_visited: f.school_visited.trim() || null,
        participants_count: f.participants_count ? Number(f.participants_count) : null,
        ppi_members_attendance: f.ppi_members_attendance ? Number(f.ppi_members_attendance) : null,
        visit_datetime: f.visit_datetime ? new Date(f.visit_datetime).toISOString() : null,
        notes: f.notes || null,
        targeted_income: null, actual_income: null,
        posts_count: null, total_reach: null, new_followers: null, content_notes: null,
        meals_bought: null, meals_given_out: null, attendees: null, location: null,
        topic: null, speaker: null, target_audience: null, actual_audience: null, duration_minutes: null, satisfaction_score: null, training_notes: null,
      };
      if (initialEntry?.id) {
        await updateEntry.mutateAsync({ id: initialEntry.id, ...payload });
        toast.success("Entry updated");
      } else {
        await addEntry.mutateAsync(payload);
        toast.success("Entry added");
      }
      setF({ messages_per_day: "", messages_replied_per_day: "", response_time_minutes: "", school_visited: "", participants_count: "", ppi_members_attendance: "", visit_datetime: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
      onSubmitted?.();
    } catch {
      toast.error(initialEntry?.id ? "Failed to update entry" : "Failed to add entry");
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Label className="text-xs">Date</Label><Input type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></div>
      <div><Label className="text-xs">Avg Messages/Day</Label><Input type="number" placeholder="0" value={f.messages_per_day} onChange={(e) => setF({ ...f, messages_per_day: e.target.value })} /></div>
      <div><Label className="text-xs">Avg Replied/Day</Label><Input type="number" placeholder="0" value={f.messages_replied_per_day} onChange={(e) => setF({ ...f, messages_replied_per_day: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Avg Response Time (minutes)</Label><Input type="number" placeholder="0" value={f.response_time_minutes} onChange={(e) => setF({ ...f, response_time_minutes: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Date & Time Visit</Label><Input type="datetime-local" value={f.visit_datetime} onChange={(e) => setF({ ...f, visit_datetime: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">School Visited</Label><Input placeholder="e.g. SMK Seri Putra" value={f.school_visited} onChange={(e) => setF({ ...f, school_visited: e.target.value })} /></div>
      <div><Label className="text-xs">Participants (School)</Label><Input type="number" placeholder="0" value={f.participants_count} onChange={(e) => setF({ ...f, participants_count: e.target.value })} /></div>
      <div><Label className="text-xs">PPI Members Attendance</Label><Input type="number" placeholder="0" value={f.ppi_members_attendance} onChange={(e) => setF({ ...f, ppi_members_attendance: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional..." /></div>
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending || updateEntry.isPending} className="w-full">{initialEntry?.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}{initialEntry?.id ? "Save Entry" : "Log Entry"}</Button></div>
    </div>
  );
}

// ---------- Outreach form ----------
function OutreachEntry({
  prokerId,
  initialEntry,
  onSubmitted,
}: {
  prokerId: string;
  initialEntry?: BerkelanjutanEntry | null;
  onSubmitted?: () => void;
}) {
  const addEntry = useAddBerkelanjutanEntry();
  const updateEntry = useUpdateBerkelanjutanEntry();
  const [f, setF] = useState({ posts_count: "", total_reach: "", new_followers: "", content_notes: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    setF({
      posts_count: initialEntry?.posts_count != null ? String(initialEntry.posts_count) : "",
      total_reach: initialEntry?.total_reach != null ? String(initialEntry.total_reach) : "",
      new_followers: initialEntry?.new_followers != null ? String(initialEntry.new_followers) : "",
      content_notes: initialEntry?.content_notes ?? "",
      notes: initialEntry?.notes ?? "",
      entry_date: initialEntry?.entry_date ?? new Date().toISOString().split("T")[0],
    });
  }, [initialEntry]);

  const submit = async () => {
    try {
      const payload = {
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
        school_visited: null, participants_count: null, ppi_members_attendance: null, visit_datetime: null,
        topic: null, speaker: null, target_audience: null, actual_audience: null, duration_minutes: null, satisfaction_score: null, training_notes: null,
      };
      if (initialEntry?.id) {
        await updateEntry.mutateAsync({ id: initialEntry.id, ...payload });
        toast.success("Entry updated");
      } else {
        await addEntry.mutateAsync(payload);
        toast.success("Entry added");
      }
      setF({ posts_count: "", total_reach: "", new_followers: "", content_notes: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
      onSubmitted?.();
    } catch {
      toast.error(initialEntry?.id ? "Failed to update entry" : "Failed to add entry");
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
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending || updateEntry.isPending} className="w-full">{initialEntry?.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}{initialEntry?.id ? "Save Entry" : "Log Entry"}</Button></div>
    </div>
  );
}

// ---------- People form ----------
function PeopleEntry({
  prokerId,
  initialEntry,
  onSubmitted,
}: {
  prokerId: string;
  initialEntry?: BerkelanjutanEntry | null;
  onSubmitted?: () => void;
}) {
  const addEntry = useAddBerkelanjutanEntry();
  const updateEntry = useUpdateBerkelanjutanEntry();
  const [f, setF] = useState({ meals_bought: "", meals_given_out: "", attendees: "", location: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    setF({
      meals_bought: initialEntry?.meals_bought != null ? String(initialEntry.meals_bought) : "",
      meals_given_out: initialEntry?.meals_given_out != null ? String(initialEntry.meals_given_out) : "",
      attendees: initialEntry?.attendees != null ? String(initialEntry.attendees) : "",
      location: initialEntry?.location ?? "",
      notes: initialEntry?.notes ?? "",
      entry_date: initialEntry?.entry_date ?? new Date().toISOString().split("T")[0],
    });
  }, [initialEntry]);

  const submit = async () => {
    try {
      const payload = {
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
        school_visited: null, participants_count: null, ppi_members_attendance: null, visit_datetime: null,
        topic: null, speaker: null, target_audience: null, actual_audience: null, duration_minutes: null, satisfaction_score: null, training_notes: null,
      };
      if (initialEntry?.id) {
        await updateEntry.mutateAsync({ id: initialEntry.id, ...payload });
        toast.success("Entry updated");
      } else {
        await addEntry.mutateAsync(payload);
        toast.success("Entry added");
      }
      setF({ meals_bought: "", meals_given_out: "", attendees: "", location: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
      onSubmitted?.();
    } catch {
      toast.error(initialEntry?.id ? "Failed to update entry" : "Failed to add entry");
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
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending || updateEntry.isPending} className="w-full">{initialEntry?.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}{initialEntry?.id ? "Save Entry" : "Log Entry"}</Button></div>
    </div>
  );
}

// ---------- Training / Seminar form ----------
function TrainingEntry({
  prokerId,
  initialEntry,
  onSubmitted,
}: {
  prokerId: string;
  initialEntry?: BerkelanjutanEntry | null;
  onSubmitted?: () => void;
}) {
  const addEntry = useAddBerkelanjutanEntry();
  const updateEntry = useUpdateBerkelanjutanEntry();
  const [f, setF] = useState({
    topic: "", speaker: "", target_audience: "", actual_audience: "",
    duration_minutes: "", satisfaction_score: "", training_notes: "", notes: "",
    entry_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    setF({
      topic: initialEntry?.topic ?? "",
      speaker: initialEntry?.speaker ?? "",
      target_audience: initialEntry?.target_audience != null ? String(initialEntry.target_audience) : "",
      actual_audience: initialEntry?.actual_audience != null ? String(initialEntry.actual_audience) : "",
      duration_minutes: initialEntry?.duration_minutes != null ? String(initialEntry.duration_minutes) : "",
      satisfaction_score: initialEntry?.satisfaction_score != null ? String(initialEntry.satisfaction_score) : "",
      training_notes: initialEntry?.training_notes ?? "",
      notes: initialEntry?.notes ?? "",
      entry_date: initialEntry?.entry_date ?? new Date().toISOString().split("T")[0],
    });
  }, [initialEntry]);

  const submit = async () => {
    try {
      const payload = {
        proker_id: prokerId,
        entry_date: f.entry_date,
        topic: f.topic || null,
        speaker: f.speaker || null,
        target_audience: f.target_audience ? Number(f.target_audience) : null,
        actual_audience: f.actual_audience ? Number(f.actual_audience) : null,
        duration_minutes: f.duration_minutes ? Number(f.duration_minutes) : null,
        satisfaction_score: f.satisfaction_score ? Number(f.satisfaction_score) : null,
        training_notes: f.training_notes || null,
        notes: f.notes || null,
        targeted_income: null, actual_income: null,
        messages_per_day: null, messages_replied_per_day: null, response_time_minutes: null,
        posts_count: null, total_reach: null, new_followers: null, content_notes: null,
        meals_bought: null, meals_given_out: null, attendees: null, location: null,
        school_visited: null, participants_count: null, ppi_members_attendance: null, visit_datetime: null,
      };
      if (initialEntry?.id) {
        await updateEntry.mutateAsync({ id: initialEntry.id, ...payload });
        toast.success("Entry updated");
      } else {
        await addEntry.mutateAsync(payload);
        toast.success("Entry added");
      }
      setF({ topic: "", speaker: "", target_audience: "", actual_audience: "", duration_minutes: "", satisfaction_score: "", training_notes: "", notes: "", entry_date: new Date().toISOString().split("T")[0] });
      onSubmitted?.();
    } catch {
      toast.error(initialEntry?.id ? "Failed to update entry" : "Failed to add entry");
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Label className="text-xs">Date</Label><Input type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Topic</Label><Input placeholder="e.g. Leadership Workshop" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Speaker / Facilitator</Label><Input placeholder="e.g. Dr. Ahmad" value={f.speaker} onChange={(e) => setF({ ...f, speaker: e.target.value })} /></div>
      <div><Label className="text-xs">Target Audience</Label><Input type="number" placeholder="0" value={f.target_audience} onChange={(e) => setF({ ...f, target_audience: e.target.value })} /></div>
      <div><Label className="text-xs">Actual Audience</Label><Input type="number" placeholder="0" value={f.actual_audience} onChange={(e) => setF({ ...f, actual_audience: e.target.value })} /></div>
      <div><Label className="text-xs">Duration (minutes)</Label><Input type="number" placeholder="60" value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: e.target.value })} /></div>
      <div><Label className="text-xs">Satisfaction (1-5)</Label><Input type="number" min={1} max={5} step={0.1} placeholder="4.5" value={f.satisfaction_score} onChange={(e) => setF({ ...f, satisfaction_score: e.target.value })} /></div>
      <div className="col-span-2"><Label className="text-xs">Training Notes</Label><Textarea rows={2} value={f.training_notes} onChange={(e) => setF({ ...f, training_notes: e.target.value })} placeholder="Key takeaways, materials used..." /></div>
      <div className="col-span-2"><Label className="text-xs">General Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional..." /></div>
      <div className="col-span-2"><Button onClick={submit} disabled={addEntry.isPending || updateEntry.isPending} className="w-full">{initialEntry?.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}{initialEntry?.id ? "Save Entry" : "Log Entry"}</Button></div>
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

function TrainingSummary({ entries }: { entries: ReturnType<typeof useBerkelanjutanEntries>["data"] }) {
  if (!entries?.length) return null;
  const totalTarget = entries.reduce((s, e) => s + (e.target_audience ?? 0), 0);
  const totalActual = entries.reduce((s, e) => s + (e.actual_audience ?? 0), 0);
  const satScores = entries.map((e) => e.satisfaction_score).filter((v): v is number => v != null);
  const avgSat = satScores.length ? (satScores.reduce((a, b) => a + b, 0) / satScores.length).toFixed(1) : "—";
  const totalDuration = entries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
  const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  return (
    <div className="space-y-3 mb-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Target Audience" value={String(totalTarget)} />
        <StatCard label="Actual Audience" value={String(totalActual)} icon={totalActual >= totalTarget ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />} />
        <StatCard label="Turnout" value={`${pct}%`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Sessions" value={String(entries.length)} />
        <StatCard label="Total Hours" value={`${(totalDuration / 60).toFixed(1)}h`} />
        <StatCard label="Avg Satisfaction" value={typeof avgSat === "string" ? avgSat : `${avgSat}/5`} />
      </div>
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
function EntryRow({ entry, category, onEdit, canEdit, onDelete, canDelete }: {
  entry: NonNullable<ReturnType<typeof useBerkelanjutanEntries>["data"]>[0];
  category: BerkelanjutanCategory;
  onEdit: () => void;
  canEdit: boolean;
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
              {entry.school_visited && <span className="text-xs">School: <b>{entry.school_visited}</b></span>}
              {entry.participants_count != null && <span className="text-xs">Participants: <b>{entry.participants_count}</b></span>}
              {entry.ppi_members_attendance != null && <span className="text-xs">PPI Attendance: <b>{entry.ppi_members_attendance}</b></span>}
              {entry.visit_datetime && <span className="text-xs text-muted-foreground">Visit: {format(new Date(entry.visit_datetime), "dd MMM yyyy, HH:mm")}</span>}
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
          {category === "training" && (
            <>
              {entry.topic && <span className="text-xs">Topic: <b>{entry.topic}</b></span>}
              {entry.speaker && <span className="text-xs">Speaker: <b>{entry.speaker}</b></span>}
              {entry.target_audience != null && <span className="text-xs">Target: <b>{entry.target_audience}</b></span>}
              {entry.actual_audience != null && <span className="text-xs">Actual: <b>{entry.actual_audience}</b></span>}
              {entry.duration_minutes != null && <span className="text-xs">Duration: <b>{entry.duration_minutes} min</b></span>}
              {entry.satisfaction_score != null && <span className="text-xs">Satisfaction: <b>{entry.satisfaction_score}/5</b></span>}
            </>
          )}
        </div>
        {entry.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.notes}</p>}
        {category === "outreach" && entry.content_notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.content_notes}</p>}
      </div>
      <div className="flex items-center gap-1">
        {canEdit && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground" aria-label="Edit entry" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" aria-label="Delete entry" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
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

export function OngoingCommentsPanel({ prokerId }: { prokerId: string }) {
  const { data: comments = [] } = useOngoingComments(prokerId);
  const addComment = useAddOngoingComment();
  const deleteComment = useDeleteOngoingComment();
  const { currentMember, isAdmin } = useMemberStore();
  const [text, setText] = useState("");

  const submit = async () => {
    const comment = text.trim();
    if (!comment) {
      toast.error("Write a comment first");
      return;
    }
    await addComment.mutateAsync({
      proker_id: prokerId,
      commenter_name: currentMember?.name ?? "Anonymous",
      commenter_division: currentMember?.division ?? null,
      comment_text: comment,
    });
    toast.success("Comment added");
    setText("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Session Comments</p>
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share updates, blockers, or notes for this ongoing proker..."
      />
      <Button onClick={submit} disabled={addComment.isPending} className="w-full">Post Comment</Button>

      {comments.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="rounded-md border border-border/60 bg-muted/30 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">{c.commenter_name}</span>
                  {c.commenter_division && <Badge variant="secondary" className="text-[10px] py-0">{c.commenter_division}</Badge>}
                  <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "dd MMM yyyy, HH:mm")}</span>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteComment.mutateAsync({ id: c.id, prokerId })}
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{c.comment_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Main component ----------
export function BerkelanjutanTracker({ prokerId, category, prokerName, division }: BerkelanjutanTrackerProps) {
  const { data: entries = [], isLoading } = useBerkelanjutanEntries(prokerId);
  const deleteEntry = useDeleteBerkelanjutanEntry();
  const { isAdmin } = useMemberStore();
  const [showForm, setShowForm] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [editingEntry, setEditingEntry] = useState<BerkelanjutanEntry | null>(null);

  const historyPageCount = Math.max(1, Math.ceil(entries.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyPageCount - 1);
  const pagedEntries = entries.slice(safeHistoryPage * HISTORY_PAGE_SIZE, (safeHistoryPage + 1) * HISTORY_PAGE_SIZE);

  const handleDelete = async (id: string) => {
    await deleteEntry.mutateAsync({ id, proker_id: prokerId });
    toast.success("Entry removed");
  };

  const onEntrySaved = () => {
    if (prokerName && division) {
      pushDashboardNotification("log", {
        prokerId,
        prokerName,
        division,
        message: editingEntry ? `Log session updated in ${division}` : `New log session added in ${division}`,
      });
    }
    setEditingEntry(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{CATEGORY_LABELS[category]} — Log Session</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (showForm) {
                  setEditingEntry(null);
                  setShowForm(false);
                } else {
                  setShowForm(true);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> {showForm ? (editingEntry ? "Cancel Edit" : "Cancel") : "Log Session"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Category stats */}
          {category === "finance" && <FinanceSummary entries={entries} />}
          {category === "response" && <ResponseSummary entries={entries} />}
          {category === "outreach" && <OutreachSummary entries={entries} />}
          {category === "people" && <PeopleSummary entries={entries} />}
          {category === "training" && <TrainingSummary entries={entries} />}

          {/* Entry form */}
          {showForm && (
            <>
              <Separator />
              <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{editingEntry ? "Edit Session" : "New Session"}</p>
                {category === "finance" && <FinanceEntry prokerId={prokerId} initialEntry={editingEntry} onSubmitted={onEntrySaved} />}
                {category === "response" && <ResponseEntry prokerId={prokerId} initialEntry={editingEntry} onSubmitted={onEntrySaved} />}
                {category === "outreach" && <OutreachEntry prokerId={prokerId} initialEntry={editingEntry} onSubmitted={onEntrySaved} />}
                {category === "people" && <PeopleEntry prokerId={prokerId} initialEntry={editingEntry} onSubmitted={onEntrySaved} />}
                {category === "training" && <TrainingEntry prokerId={prokerId} initialEntry={editingEntry} onSubmitted={onEntrySaved} />}
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
              {pagedEntries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  category={category}
                  canEdit
                  onEdit={() => {
                    setEditingEntry(entry);
                    setShowForm(true);
                  }}
                  canDelete={isAdmin}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
              {historyPageCount > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Button variant="outline" size="sm" disabled={safeHistoryPage === 0} onClick={() => setHistoryPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {safeHistoryPage + 1} / {historyPageCount}
                  </span>
                  <Button variant="outline" size="sm" disabled={safeHistoryPage >= historyPageCount - 1} onClick={() => setHistoryPage((p) => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
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
