import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  ClipboardCheck,
  Star,
  Eye,
  Activity,
  Repeat2,
  Users,
  DollarSign,
  MessageSquare,
  Megaphone,
  Heart,
  HelpCircle,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

export default function GuidePage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">User Guide</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Everything you need to know about using the PPI UPM Proker Dashboard
        </p>
      </div>

      {/* Quick Start */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1.</strong> When you first open the app, you'll see the <strong>Onboarding</strong> screen. If you already have an account, enter your name to log in. If you're new, click <em>"No, I'm new — register"</em> to create your profile.
          </p>
          <p>
            <strong>2.</strong> After logging in, you'll land on the <strong>Dashboard Overview</strong> which shows all divisions and overall statistics.
          </p>
          <p>
            <strong>3.</strong> Use the <strong>sidebar</strong> to navigate between divisions, the Members page, or return here to the Guide.
          </p>
        </CardContent>
      </Card>

      {/* Main Sections as Accordion */}
      <Accordion type="multiple" defaultValue={["proker-types", "creating", "zones", "meetings", "tracker", "engagement", "ratings", "analytics"]} className="space-y-3">
        {/* Understanding Proker Types */}
        <AccordionItem value="proker-types" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span className="font-semibold">Understanding Proker Types</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              There are two main kinds of prokers in this system:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-sm">One-Time Proker</span>
                    <Badge variant="secondary" className="text-[10px]">Default</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A regular proker with a start date, target participants, and a progress bar. Once it reaches 100%, you can mark it as <strong>Complete</strong> and fill out a completion report.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Tabs available:</strong> Overview, Promotion, Engagement, Rating, Internal Ratings.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Repeat2 className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-sm">Berkelanjutan (Ongoing)</span>
                    <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">Ongoing</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    An ongoing proker that doesn't have a progress bar or completion step. Instead, it has a <strong>Tracker</strong> tab where you log periodic entries.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The Promotion and Engagement tabs are shown only when relevant to the category (see below).
                  </p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <p className="text-sm font-semibold">Berkelanjutan Categories</p>
            <p className="text-xs text-muted-foreground">
              When creating an ongoing proker, you select a category that determines the tracker metrics:
            </p>

            <div className="grid gap-2">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <DollarSign className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">💰 Finance (Danus)</p>
                  <p className="text-xs text-muted-foreground">
                    Track <strong>targeted income</strong> vs <strong>actual income</strong> per entry. Great for fundraising divisions. Only Rating and Internal tabs shown (no Promo/Engage).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <MessageSquare className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">💬 Response Time (Humas)</p>
                  <p className="text-xs text-muted-foreground">
                    Track <strong>messages/day</strong>, <strong>replies/day</strong>, and <strong>average response time</strong>. Ideal for communication divisions. Only Rating and Internal tabs shown.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Megaphone className="h-5 w-5 text-pink-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">📣 Outreach &amp; Content</p>
                  <p className="text-xs text-muted-foreground">
                    Track <strong>posts count</strong>, <strong>total reach</strong>, and <strong>new followers</strong>. Perfect for social-media management. The <strong>Promotion</strong> tab is also shown to track platforms and views.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Heart className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">🤝 People &amp; Community</p>
                  <p className="text-xs text-muted-foreground">
                    Track <strong>meals bought</strong>, <strong>meals given out</strong>, <strong>attendees</strong>, and <strong>location</strong>. Great for community programs like Jumat Berkah. The <strong>Engagement</strong> tab is also shown.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Star className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">🎓 Training / Seminar</p>
                  <p className="text-xs text-muted-foreground">
                    Track <strong>topic</strong>, <strong>target audience</strong>, <strong>actual audience</strong>, <strong>speaker(s)</strong>, and <strong>location</strong> for each session. Designed for educational or upskilling programs. Only the <strong>Rating</strong> and <strong>Internal</strong> tabs are shown (no Promo/Engage).
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Creating a Proker */}
        <AccordionItem value="creating" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" />
              <span className="font-semibold">Creating a Proker</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                Navigate to a <strong>Division page</strong> using the sidebar.
              </li>
              <li>
                Click the <strong>"+ New Proker"</strong> button in the top-right corner.
              </li>
              <li>
                Fill in the required fields:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><strong>Nama Proker</strong> — the name of your program</li>
                  <li><strong>Division</strong> — primary division</li>
                  <li><strong>Date</strong> — planned date</li>
                  <li><strong>Target Peserta</strong> — expected participant count</li>
                  <li><strong>Type</strong> — Internal or External</li>
                </ul>
              </li>
              <li>
                <strong>Current Zone:</strong> Choose whether the proker is currently in <strong>Red</strong>, <strong>Medium</strong>, or <strong>Green</strong> zone.
              </li>
              <li>
                Fill only the selected zone details: <strong>current status</strong>, <strong>current problem</strong>, <strong>way out</strong>, <strong>what needs to be done</strong>, and <strong>deadline</strong>.
              </li>
              <li>
                <strong>Collaboration:</strong> If this proker is a joint effort, click the other division badges to add them. The proker will appear in both divisions' views and analytics automatically.
              </li>
              <li>
                <strong>Berkelanjutan (Ongoing):</strong> Toggle the switch on if this is a recurring program. Then select a category (Finance, Response, Outreach, or People). This changes the tracker form to match the relevant metrics.
              </li>
              <li>
                The creator is saved automatically from the currently logged-in member and shown on the proker card/detail.
              </li>
              <li>
                Click <strong>Create Proker</strong> to save.
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        {/* Proker Zones */}
        <AccordionItem value="zones" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold">Proker Zones (Red / Medium / Green)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <p>
              Zone tracking is for <strong>active</strong> prokers only. Each active proker has one <strong>current zone</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Red Zone</strong> — most dangerous / urgent condition</li>
              <li><strong>Medium Zone</strong> — caution but manageable</li>
              <li><strong>Green Zone</strong> — safe / under control</li>
            </ul>
            <p>
              For the selected zone, fill these fields: current status, current problem, way out, action needed, and deadline.
            </p>
            <p>
              In each division page, active prokers are grouped by zone. You can also filter by a specific zone.
            </p>
            <p>
              Once a proker is marked complete, zone info is removed and no longer shown.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Meetings */}
        <AccordionItem value="meetings" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="font-semibold">Meetings Module (Scheduled &amp; Complete)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <p>
              Each division now has a <strong>Meetings</strong> mode (toggle between <strong>Prokers</strong> and <strong>Meetings</strong> on the division page).
            </p>

            <p className="font-medium text-foreground">Scheduled Phase</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Topic of discussion</strong></li>
              <li><strong>Date</strong> and <strong>time</strong></li>
              <li><strong>Expected joined people</strong></li>
            </ul>

            <p className="font-medium text-foreground">Complete Phase</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Actual joined people</strong></li>
              <li><strong>Meeting notes</strong> with a maximum of <strong>5000 words</strong></li>
            </ul>

            <p>
              Meeting lists are separated into <strong>Scheduled</strong> and <strong>Completed</strong>, and each item can be edited or deleted.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Using the Log Tracker (Berkelanjutan) */}
        <AccordionItem value="tracker" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Repeat2 className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">Log Tracker (Berkelanjutan)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <p>
              For ongoing prokers, the <strong>Tracker</strong> tab is where you log periodic data entries. The fields you fill in depend on the selected category:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li><strong>Finance:</strong> Targeted income, actual income</li>
              <li><strong>Response:</strong> Messages/day, replies/day, average response time</li>
              <li><strong>Outreach:</strong> Posts count, total reach, new followers</li>
              <li><strong>People:</strong> Meals bought, meals given out, attendees, location</li>
              <li><strong>Training/Seminar:</strong> Topic, target audience, actual audience, speaker(s), location</li>
            </ul>
            <ol className="list-decimal list-inside space-y-2">
              <li>Open the berkelanjutan proker by clicking its card.</li>
              <li>Go to the <strong>Tracker</strong> tab.</li>
              <li>Click <strong>"+ Log Entry"</strong> to expand the form.</li>
              <li>Select the <strong>date</strong> and fill in the metrics relevant to your category.</li>
              <li>Click <strong>"Log Entry"</strong> to save.</li>
            </ol>
            <p>
              The summary cards at the top automatically compute <strong>totals</strong> and <strong>averages</strong> from all logged entries. For <strong>Training/Seminar</strong>, you can see the most frequent topics, average audience, and speaker stats. You can delete entries if you're an admin.
            </p>
            <p>
              The <strong>Overview</strong> tab also shows a mini-summary of your tracker data (e.g. income achievement %, average response time, total reach, or for training: average audience and top topics).
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Filling in Engagement & Promotion */}
        <AccordionItem value="engagement" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="font-semibold">Engagement &amp; Promotion</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <p>
              For <strong>one-time prokers</strong>, Promotion and Engagement are always available. For <strong>berkelanjutan prokers</strong>, they appear only if relevant:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Outreach</strong> category → Promotion tab shown (track platforms, views, groups shared)</li>
              <li><strong>People</strong> category → Engagement tab shown (track attendance, feedback, social reach)</li>
              <li><strong>Finance / Response</strong> → Neither shown (use the Tracker tab instead)</li>
            </ul>

            <Separator />

            <p className="font-medium text-foreground">Promotion Tab</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Estimated Views</strong> — how many people saw the promotion</li>
              <li><strong>Platforms</strong> — Instagram, WhatsApp, Twitter, etc.</li>
              <li><strong>Groups Shared</strong> — which WhatsApp/Telegram groups it was shared in</li>
            </ul>

            <p className="font-medium text-foreground">Engagement Tab</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Attendance Rate</strong> — percentage of target who attended (0-100%)</li>
              <li><strong>Feedback Score</strong> — participant satisfaction (0-5)</li>
              <li><strong>Social Media Reach</strong> — post-event social impressions</li>
              <li><strong>Other Notes</strong> — qualitative feedback</li>
            </ul>

            <p>
              All changes across Promotion, Engagement, and Rating tabs are saved together using the <strong>"Save All Analytics"</strong> button that appears at the bottom when you make changes.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Rating & Internal Ratings */}
        <AccordionItem value="ratings" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">Ratings (Self &amp; Internal)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Rating Tab (Self-Assessment)</p>
            <p>
              The proker owner rates their own program on 5 criteria:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Planning</strong> — how well-planned was the proker</li>
              <li><strong>Execution</strong> — how smoothly it was carried out</li>
              <li><strong>Impact</strong> — what effect it had on participants</li>
              <li><strong>Creativity</strong> — innovation and uniqueness</li>
              <li><strong>Teamwork</strong> — collaboration quality</li>
            </ul>
            <p>Each is rated 1-5 stars. The overall rating is the average of non-zero criteria.</p>

            <Separator />

            <p className="font-medium text-foreground">Internal Tab (Peer Ratings)</p>
            <p>
              Any member from <strong>any division</strong> can rate a proker. This is the "internal rating" system.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click 1-5 stars to select your rating</li>
              <li>Add optional comments/notes</li>
              <li>Click <strong>"Submit Internal Rating"</strong></li>
            </ul>
            <p>
              Ratings show as a badge on the proker card: e.g. <em>"⭐ 4.5 internal (3)"</em> meaning 4.5 average from 3 peer ratings. Each rating displays the rater's name and division.
            </p>
            <p>
              For berkelanjutan prokers, the <strong>Peer Ratings</strong> panel also appears inside the Tracker tab.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Completing a Proker */}
        <AccordionItem value="completing" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-green-600" />
              <span className="font-semibold">Completing a One-Time Proker</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open the proker and go to the <strong>Overview</strong> tab.</li>
              <li>Click the green <strong>"Mark as Complete"</strong> button.</li>
              <li>Fill in the completion form:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><strong>Actual Peserta</strong> — how many actually attended</li>
                  <li><strong>Success Factors</strong> — what went well</li>
                  <li><strong>Improvements</strong> — what could be better next time</li>
                  <li><strong>Notes</strong> — any additional information</li>
                </ul>
              </li>
              <li>Click <strong>Save</strong> to complete the proker.</li>
            </ol>
            <p>
              Once completed, the proker card turns green and shows a completion badge. Notes can still be edited afterwards.
            </p>
            <p>
              Completed prokers are shown in a dedicated <strong>Completed Prokers</strong> section in each division page.
            </p>
            <p>
              <strong>Note:</strong> Berkelanjutan prokers do <em>not</em> have a completion step — they remain ongoing.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Collaboration Prokers */}
        <AccordionItem value="collab" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold">Collaboration Prokers</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <p>
              Some prokers are joint efforts between two or more divisions.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>When creating/editing a proker, click the <strong>division badges</strong> below the primary division to toggle collaboration.</li>
              <li>A collab proker appears in <strong>all involved divisions'</strong> tabs.</li>
              <li>Updates (progress, analytics, ratings) sync across all divisions — there is only one record.</li>
              <li>Analytics dashboards count collab prokers for <strong>all participating divisions</strong>.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Analytics Dashboard */}
        <AccordionItem value="analytics" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold">Analytics Dashboard</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <p>
              The <strong>Dashboard Overview</strong> page (home) shows aggregate analytics at the bottom:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Average Rating</strong> — across all rated prokers</li>
              <li><strong>Total Views</strong> — from all promotion data</li>
              <li><strong>Average Attendance</strong> — from engagement data</li>
              <li><strong>Total Social Reach</strong> — combined social media impressions</li>
              <li><strong>Average Feedback</strong> — participant satisfaction score</li>
            </ul>
            <p>
              Charts include a <strong>Rating Radar</strong> (criteria breakdown), <strong>Platform Distribution</strong> (pie chart), <strong>Division Performance</strong> (bar chart), and <strong>Top Rated Prokers</strong> leaderboard.
            </p>
            <p>
              To populate these charts, fill in Promotion, Engagement, and Rating data on your prokers.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Members */}
        <AccordionItem value="members" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold">Members &amp; Admin</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <p>
              The <strong>Members</strong> page lists all registered members. Only admins can export the member list to CSV.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Members are shown per division</li>
              <li>Admins can manage members and have elevated permissions (delete prokers, delete ratings, export data)</li>
              <li>Your logged-in identity appears in the top-right header bar</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* FAQ / Tips */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            Tips &amp; FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Q: How do I edit a proker after saving?</p>
            <p>Open the proker, click the <strong>Edit</strong> button in the top-right of the dialog. You can also edit notes at any time from the Overview tab.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">Q: Why don't I see Promotion or Engagement tabs?</p>
            <p>For berkelanjutan prokers, these tabs are hidden if they're not relevant to your category. Finance and Response categories use the Tracker instead. Outreach shows Promotion; People shows Engagement.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">Q: How does the "Save All Analytics" button work?</p>
            <p>When you modify Promotion, Engagement, or Rating on any tab, the "Save All Analytics" button appears at the bottom. It saves all three at once so you don't have to save each separately.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">Q: Why does a collab proker appear in multiple divisions?</p>
            <p>By design. A collaboration proker is stored once but shown in all participating divisions. Any update is reflected everywhere, including analytics.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">Q: Why can't I see zones on a completed proker?</p>
            <p>Zones are only used while a proker is active. When marked complete, zone data is removed and the proker moves to the Completed Prokers section.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">Q: Is there a limit for meeting notes?</p>
            <p>Yes. Meeting notes in the complete phase are limited to 5000 words, with a live counter in the completion dialog.</p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">Q: Can I delete a proker?</p>
            <p>Only the proker creator or an admin can delete it. Click <strong>Delete</strong> once, then <strong>Confirm Delete</strong> within 3 seconds.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
