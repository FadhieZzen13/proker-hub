import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProkers, DIVISIONS } from "@/hooks/useProkers";
import { useProkerAnalytics, computeOverallRating, type ProkerAnalytics } from "@/hooks/useProkerAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from "recharts";
import { Star, Eye, Activity, TrendingUp, Users, Globe, MessageSquare, Share2 } from "lucide-react";

const CHART_COLORS = ["#1e3a5f", "#c9302c", "#d4a843", "#2d7a4f", "#5b8db8", "#8b5cf6", "#f97316", "#06b6d4"];

export function ProkerAnalyticsDashboard() {
  const { data: prokers } = useProkers();
  const { allData } = useProkerAnalytics();

  const analytics = useMemo(() => {
    if (!prokers) return null;

    // Only include analytics for prokers that are currently active/complete (not archived/deleted)
    const activeIds = new Set(prokers.map((p) => p.id));
    const allAnalytics = Object.entries(allData)
      .filter(([id]) => activeIds.has(id))
      .map(([, v]) => v);
    const withRatings = allAnalytics.filter((a) => computeOverallRating(a.rating) > 0);
    const withPromotion = allAnalytics.filter((a) => a.promotion.views > 0 || a.promotion.platforms.length > 0);
    const withEngagement = allAnalytics.filter((a) => a.engagement.attendance_rate > 0);

    // Average ratings
    const avgRating =
      withRatings.length > 0
        ? parseFloat((withRatings.reduce((s, a) => s + computeOverallRating(a.rating), 0) / withRatings.length).toFixed(1))
        : 0;

    // Total views
    const totalViews = allAnalytics.reduce((s, a) => s + (a.promotion?.views || 0), 0);

    // Average attendance
    const avgAttendance =
      withEngagement.length > 0
        ? Math.round(withEngagement.reduce((s, a) => s + a.engagement.attendance_rate, 0) / withEngagement.length)
        : 0;

    // Total social media reach
    const totalReach = allAnalytics.reduce((s, a) => s + (a.engagement?.social_media_reach || 0), 0);

    // Average feedback
    const withFeedback = allAnalytics.filter((a) => a.engagement.feedback_score > 0);
    const avgFeedback =
      withFeedback.length > 0
        ? parseFloat((withFeedback.reduce((s, a) => s + a.engagement.feedback_score, 0) / withFeedback.length).toFixed(1))
        : 0;

    // Platform distribution
    const platformCounts: Record<string, number> = {};
    allAnalytics.forEach((a) => {
      a.promotion?.platforms?.forEach((p) => {
        platformCounts[p] = (platformCounts[p] || 0) + 1;
      });
    });
    const platformData = Object.entries(platformCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Rating by criteria (avg)
    const ratingCriteria = ["planning", "execution", "impact", "creativity", "teamwork"] as const;
    const radarData = ratingCriteria.map((key) => {
      const values = withRatings.map((a) => a.rating[key]).filter((v) => v > 0);
      const avg = values.length > 0 ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : 0;
      return { criteria: key.charAt(0).toUpperCase() + key.slice(1), value: avg, fullMark: 5 };
    });

    // Division performance
    const divisionData = DIVISIONS.map((div) => {
      const divProkers = prokers.filter((p) => p.division === div);
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

    // Top rated prokers
    const topRated = prokers
      .map((p) => ({
        ...p,
        analytics: allData[p.id],
        overall: allData[p.id] ? computeOverallRating(allData[p.id].rating) : 0,
      }))
      .filter((p) => p.overall > 0)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5);

    return {
      avgRating,
      totalViews,
      avgAttendance,
      totalReach,
      avgFeedback,
      platformData,
      radarData,
      divisionData,
      topRated,
      withRatings: withRatings.length,
      withPromotion: withPromotion.length,
      withEngagement: withEngagement.length,
      totalProkers: prokers.length,
    };
  }, [prokers, allData]);

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Proker Analytics</h2>
        <p className="text-sm text-muted-foreground">Performance insights across all prokers</p>
      </div>

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
        {/* Rating Radar */}
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

        {/* Platform Distribution */}
        {analytics.platformData.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Platform Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
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

        {/* Division Performance */}
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

        {/* Top Rated */}
        {analytics.topRated.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Rated Prokers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topRated.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.nama_proker}</p>
                      <p className="text-xs text-muted-foreground">{p.division}</p>
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

      {/* Empty state */}
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
