import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProkers, DIVISIONS, type Proker } from "@/hooks/useProkers";
import { deriveAllAnalytics, computeOverallRating, type ProkerAnalytics } from "@/hooks/useProkerAnalytics";
import { useBerkelanjutanEntries } from "@/hooks/useBerkelanjutan";
import { useInternalRatings, averageInternalRating } from "@/hooks/useInternalRatings";
import { CATEGORY_LABELS, type BerkelanjutanCategory } from "@/hooks/useBerkelanjutan";
import { getProkerDisplayName } from "@/lib/prokerDisplay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Star, Eye, Activity, TrendingUp, Users, Globe, MessageSquare, Share2, Repeat2, ChevronLeft, ChevronRight, DollarSign, Clock, Megaphone, Heart, GraduationCap } from "lucide-react";

const CHART_COLORS = ["#1e3a5f", "#c9302c", "#d4a843", "#2d7a4f", "#5b8db8", "#8b5cf6", "#f97316", "#06b6d4"];
const PAGE_SIZE_TOP = 5;

export function ProkerAnalyticsDashboard() {
  const { data: allProkers } = useProkers();
  // Exclude drafts (Lapak Kerja incomplete) from analytics.
  const prokers = useMemo(() => (allProkers ?? []).filter((p) => p.lapak_ready), [allProkers]);
  const [viewMode, setViewMode] = useState<"one-time" | "ongoing">("one-time");
  const [topRatedPage, setTopRatedPage] = useState(0);

  const analytics = useMemo(() => {
    if (!prokers) return null;

    const allData = deriveAllAnalytics(prokers);
    // Separate one-time vs ongoing
    const oneTimeProkers = prokers.filter((p) => !p.is_berkelanjutan);
    const ongoingProkers = prokers.filter((p) => p.is_berkelanjutan);

    const oneTimeAnalytics = oneTimeProkers.map((p) => allData[p.id]).filter(Boolean);
    const withRatings = oneTimeAnalytics.filter((a) => computeOverallRating(a.rating) > 0);
    const withPromotion = oneTimeAnalytics.filter((a) => a.promotion.views > 0 || a.promotion.platforms.length > 0);
    const withEngagement = oneTimeAnalytics.filter((a) => a.engagement.attendance_rate > 0);

    const avgRating =
      withRatings.length > 0
        ? parseFloat((withRatings.reduce((s, a) => s + computeOverallRating(a.rating), 0) / withRatings.length).toFixed(1))
        : 0;

    const totalViews = oneTimeAnalytics.reduce((s, a) => s + (a.promotion?.views || 0), 0);

    const avgAttendance =
      withEngagement.length > 0
        ? Math.round(withEngagement.reduce((s, a) => s + a.engagement.attendance_rate, 0) / withEngagement.length)
        : 0;

    const totalReach = oneTimeAnalytics.reduce((s, a) => s + (a.engagement?.social_media_reach || 0), 0);

    const withFeedback = oneTimeAnalytics.filter((a) => a.engagement.feedback_score > 0);
    const avgFeedback =
      withFeedback.length > 0
        ? parseFloat((withFeedback.reduce((s, a) => s + a.engagement.feedback_score, 0) / withFeedback.length).toFixed(1))
        : 0;

    const platformCounts: Record<string, number> = {};
    oneTimeAnalytics.forEach((a) => {
      a.promotion?.platforms?.forEach((p) => {
        platformCounts[p] = (platformCounts[p] || 0) + 1;
      });
    });
    const platformData = Object.entries(platformCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const ratingCriteria = ["planning", "execution", "impact", "creativity", "teamwork"] as const;
    const radarData = ratingCriteria.map((key) => {
      const values = withRatings.map((a) => a.rating[key]).filter((v) => v > 0);
      const avg = values.length > 0 ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : 0;
      return { criteria: key.charAt(0).toUpperCase() + key.slice(1), value: avg, fullMark: 5 };
    });

    // Division performance (include collab divisions)
    const divisionData = DIVISIONS.map((div) => {
      const divProkers = prokers.filter(
        (p) => !p.is_berkelanjutan && (p.division === div || (p.collab_divisions ?? []).includes(div))
      );
      const divAnalytics = divProkers
        .map((p) => allData[p.id])
        .filter(Boolean) as ProkerAnalytics[];
      const rated = divAnalytics.filter((a) => computeOverallRating(a.rating) > 0);
      const avgDivRating =
        rated.length > 0
          ? parseFloat((rated.reduce((s, a) => s + computeOverallRating(a.rating), 0) / rated.length).toFixed(1))
          : 0;
      return { division: div, rating: avgDivRating, prokers: divProkers.length };
    }).filter((d) => d.prokers > 0);

    // Top rated prokers — include collab divisions in label, show ALL rated (paginated later)
    const topRated = prokers
      .filter((p) => !p.is_berkelanjutan)
      .map((p) => {
        const a = allData[p.id];
        const overall = a ? computeOverallRating(a.rating) : 0;
        const allDivs = [p.division, ...(p.collab_divisions ?? [])].join(", ");
        return { ...p, analytics: a, overall, allDivisions: allDivs };
      })
      .filter((p) => p.overall > 0)
      .sort((a, b) => b.overall - a.overall);

    return {
      avgRating, totalViews, avgAttendance, totalReach, avgFeedback,
      platformData, radarData, divisionData, topRated,
      withRatings: withRatings.length,
      withPromotion: withPromotion.length,
      withEngagement: withEngagement.length,
      totalProkers: oneTimeProkers.length,
      ongoingProkers,
    };
  }, [prokers]);

  if (!analytics) return null;

  const topRatedPageCount = Math.max(1, Math.ceil(analytics.topRated.length / PAGE_SIZE_TOP));
  const pagedTopRated = analytics.topRated.slice(topRatedPage * PAGE_SIZE_TOP, (topRatedPage + 1) * PAGE_SIZE_TOP);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Proker Analytics</h2>
          <p className="text-sm text-muted-foreground">Performance insights across all prokers</p>
        </div>
        {/* Toggle between one-time and ongoing view */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${viewMode === "one-time" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            onClick={() => setViewMode("one-time")}
          >
            One-Time
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${viewMode === "ongoing" ? "bg-blue-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
            onClick={() => setViewMode("ongoing")}
          >
            <Repeat2 className="h-3.5 w-3.5" /> Ongoing
          </button>
        </div>
      </div>

      {viewMode === "one-time" ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard
              icon={<Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
              label="Avg Rating"
              value={analytics.avgRating > 0 ? `${analytics.avgRating}/5` : "—"}
              sub={`${analytics.withRatings} rated`}
            />
            <SummaryCard
              icon={<Eye className="h-5 w-5 text-blue-500" />}
              label="Total Views"
              value={analytics.totalViews.toLocaleString()}
              sub={`${analytics.withPromotion} promoted`}
            />
            <SummaryCard
              icon={<Users className="h-5 w-5 text-green-500" />}
              label="Avg Attendance"
              value={analytics.avgAttendance > 0 ? `${analytics.avgAttendance}%` : "—"}
              sub={`${analytics.withEngagement} tracked`}
            />
            <SummaryCard
              icon={<Globe className="h-5 w-5 text-purple-500" />}
              label="Total Reach"
              value={analytics.totalReach.toLocaleString()}
              sub="Social media"
            />
            <SummaryCard
              icon={<MessageSquare className="h-5 w-5 text-orange-500" />}
              label="Avg Feedback"
              value={analytics.avgFeedback > 0 ? `${analytics.avgFeedback}/5` : "—"}
              sub="Satisfaction"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics.radarData.some((d) => d.value > 0) && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Average Rating by Criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={analytics.radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
                      <Radar name="Average" dataKey="value" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {analytics.platformData.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Share2 className="h-4 w-4" /> Platform Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={analytics.platformData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {analytics.platformData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {analytics.divisionData.some((d) => d.rating > 0) && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Division Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.divisionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="division" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="rating" fill="#1e3a5f" radius={[4, 4, 0, 0]} name="Avg Rating" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top Rated — paginated */}
            {analytics.topRated.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Top Rated Prokers
                    </CardTitle>
                    {topRatedPageCount > 1 && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={topRatedPage === 0} onClick={() => setTopRatedPage((p) => p - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{topRatedPage + 1}/{topRatedPageCount}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={topRatedPage >= topRatedPageCount - 1} onClick={() => setTopRatedPage((p) => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pagedTopRated.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">#{topRatedPage * PAGE_SIZE_TOP + i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.nama_proker}</p>
                          <p className="text-xs text-muted-foreground">{p.allDivisions}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-foreground">{p.overall}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {analytics.withRatings === 0 && analytics.withPromotion === 0 && analytics.withEngagement === 0 && (
            <Card className="border-border/60 border-dashed">
              <CardContent className="py-12 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No analytics data yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Open any proker and add promotion data, engagement metrics, or ratings to see analytics here
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <OngoingAnalyticsView prokers={analytics.ongoingProkers} />
      )}
    </div>
  );
}

// ========== Ongoing Analytics View ==========

function OngoingAnalyticsView({ prokers }: { prokers: Proker[] }) {
  const [catFilter, setCatFilter] = useState<BerkelanjutanCategory | "all">("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 6;

  const filtered = catFilter === "all" ? prokers : prokers.filter((p) => p.berkelanjutan_category === catFilter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Aggregate by category
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { finance: 0, response: 0, outreach: 0, people: 0, training: 0 };
    prokers.forEach((p) => {
      if (p.berkelanjutan_category && counts[p.berkelanjutan_category] !== undefined) {
        counts[p.berkelanjutan_category]++;
      }
    });
    return counts;
  }, [prokers]);

  const catIcons: Record<string, React.ReactNode> = {
    finance: <DollarSign className="h-5 w-5 text-yellow-600" />,
    response: <Clock className="h-5 w-5 text-purple-600" />,
    outreach: <Megaphone className="h-5 w-5 text-pink-600" />,
    people: <Heart className="h-5 w-5 text-red-600" />,
    training: <GraduationCap className="h-5 w-5 text-teal-600" />,
  };

  if (prokers.length === 0) {
    return (
      <Card className="border-border/60 border-dashed">
        <CardContent className="py-12 text-center">
          <Repeat2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No ongoing prokers yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a berkelanjutan proker to see ongoing analytics here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {(["finance", "response", "outreach", "people", "training"] as const).map((cat) => (
          <Card
            key={cat}
            className={`border-border/60 cursor-pointer transition-all ${catFilter === cat ? "ring-2 ring-blue-500 border-blue-300" : "hover:border-primary/20"}`}
            onClick={() => { setCatFilter((prev) => prev === cat ? "all" : cat); setPage(0); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">{catIcons[cat]}</div>
              <p className="text-xl font-bold text-foreground">{catCounts[cat]}</p>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[cat]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {catFilter !== "all" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[catFilter]}</Badge>
          <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setCatFilter("all")}>Clear filter</Button>
        </div>
      )}

      {/* Per-proker ongoing cards with mini analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {paged.map((p) => (
          <OngoingProkerSummaryCard key={p.id} proker={p} />
        ))}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function OngoingProkerSummaryCard({ proker }: { proker: Proker }) {
  const cat = proker.berkelanjutan_category as BerkelanjutanCategory | null;
  const prokerDisplayName = getProkerDisplayName(proker.nama_proker, proker.description);
  const { data: entries = [] } = useBerkelanjutanEntries(proker.id);
  const { data: ratings = [] } = useInternalRatings(proker.id);
  const peerAvg = averageInternalRating(ratings);

  const allDivs = [proker.division, ...(proker.collab_divisions ?? [])].join(", ");

  return (
    <Card className="border-border/60 border-l-2 border-l-blue-400">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold line-clamp-2 break-words">{prokerDisplayName}</CardTitle>
            <p className="text-xs text-muted-foreground">{allDivs}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {cat && <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[cat]}</Badge>}
            {peerAvg > 0 && (
              <Badge variant="outline" className="gap-0.5 text-[10px] border-purple-300 text-purple-600">
                <Star className="h-2.5 w-2.5 fill-purple-400 text-purple-400" /> {peerAvg}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!cat || entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No log session entries yet</p>
        ) : (
          <>
            {cat === "finance" && <FinanceMini entries={entries} />}
            {cat === "response" && <ResponseMini entries={entries} />}
            {cat === "outreach" && <OutreachMini entries={entries} />}
            {cat === "people" && <PeopleMini entries={entries} />}
            {cat === "training" && <TrainingMini entries={entries} />}
          </>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">{entries.length} entries</span>
          {ratings.length > 0 && <span className="text-[10px] text-muted-foreground">{ratings.length} peer ratings</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FinanceMini({ entries }: { entries: any[] }) {
  const totalTarget = entries.reduce((s: number, e: { targeted_income: number | null }) => s + (e.targeted_income ?? 0), 0);
  const totalActual = entries.reduce((s: number, e: { actual_income: number | null }) => s + (e.actual_income ?? 0), 0);
  const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-2">
      <MiniStat label="Target" value={`RM ${totalTarget.toLocaleString()}`} />
      <MiniStat label="Actual" value={`RM ${totalActual.toLocaleString()}`} />
      <MiniStat label="Achievement" value={`${pct}%`} highlight={pct >= 100 ? "green" : pct >= 50 ? "yellow" : "red"} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResponseMini({ entries }: { entries: any[] }) {
  const avg = (key: string) => {
    const vals = entries.map((e: Record<string, number | null>) => e[key]).filter((v): v is number => v != null);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      <MiniStat label="Msg/Day" value={avg("messages_per_day")} />
      <MiniStat label="Replied/Day" value={avg("messages_replied_per_day")} />
      <MiniStat label="Response" value={`${avg("response_time_minutes")} min`} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutreachMini({ entries }: { entries: any[] }) {
  const total = (key: string) => entries.reduce((s: number, e: Record<string, number | null>) => s + ((e[key] as number) ?? 0), 0);
  return (
    <div className="grid grid-cols-3 gap-2">
      <MiniStat label="Posts" value={String(total("posts_count"))} />
      <MiniStat label="Reach" value={total("total_reach").toLocaleString()} />
      <MiniStat label="Followers" value={`+${total("new_followers")}`} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PeopleMini({ entries }: { entries: any[] }) {
  const total = (key: string) => entries.reduce((s: number, e: Record<string, number | null>) => s + ((e[key] as number) ?? 0), 0);
  return (
    <div className="grid grid-cols-3 gap-2">
      <MiniStat label="Bought" value={String(total("meals_bought"))} />
      <MiniStat label="Given" value={String(total("meals_given_out"))} />
      <MiniStat label="Attendees" value={String(total("attendees"))} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrainingMini({ entries }: { entries: any[] }) {
  const totalTarget = entries.reduce((s: number, e: { target_audience: number | null }) => s + (e.target_audience ?? 0), 0);
  const totalActual = entries.reduce((s: number, e: { actual_audience: number | null }) => s + (e.actual_audience ?? 0), 0);
  const satScores = entries.map((e: { satisfaction_score: number | null }) => e.satisfaction_score).filter((v: number | null): v is number => v != null);
  const avgSat = satScores.length ? (satScores.reduce((a, b) => a + b, 0) / satScores.length).toFixed(1) : "—";
  const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-2">
      <MiniStat label="Audience" value={`${totalActual}/${totalTarget}`} />
      <MiniStat label="Turnout" value={`${pct}%`} highlight={pct >= 100 ? "green" : pct >= 50 ? "yellow" : "red"} />
      <MiniStat label="Satisfaction" value={typeof avgSat === "string" ? avgSat : `${avgSat}/5`} />
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "yellow" | "red" }) {
  const color = highlight === "green" ? "text-green-600" : highlight === "red" ? "text-red-600" : highlight === "yellow" ? "text-yellow-600" : "text-foreground";
  return (
    <div className="rounded-md bg-muted/50 p-2 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function SummaryCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">{icon}</div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
