Implementation Plan — 6 Revisions
Foundation (do first — two features depend on it)
F1. Add "Bendahara" position
src/hooks/useMemberStore.ts — extend MemberPosition to "Kadep" | "Wakadep" | "Staff" | "Secretary" | "Bendahara".
src/lib/roles.ts — add "Bendahara" to POSITIONS, add isBendahara(member) helper, and canCommentRab(member, isAdmin) = admin ∥ Bendahara, plus canCommentLapak(member, isAdmin) = admin ∥ Secretary ∥ Bendahara.
DB: none needed if members.position is a plain text column (verify in Supabase; if it's a CHECK constraint or enum, one ALTER migration).
Position pickers (Members page claim/edit form) pick up the new value automatically since they map over POSITIONS.
F2. Cross-user notifications (derived, no new infra)
Replace/augment the localStorage bell with computed notifications:

New hook src/hooks/useMyNotifications.ts that composes:
tasks assigned to me (from F4) that aren't done,
today's birthdays (from F6),
existing localStorage items (keep as-is for activity feed).
"Read" state: store seen notification ids in localStorage (per browser — acceptable given the app's existing session model).
NotificationBell.tsx renders the merged list.
Features
F3. Per-division KPI targets on dashboard (divisi meminta KPI nya sendiri)
DB migration — new table:
create table division_kpis (
  id uuid primary key default gen_random_uuid(),
  division text not null,
  proker_id uuid references prokers(id) on delete cascade, -- nullable: KPI can be division-wide or per-proker
  label text not null,          -- "Adakan 3 event kolaborasi"
  target numeric not null default 0,
  current numeric not null default 0,
  unit text default '',         -- "event", "%", "orang"
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
New hook src/hooks/useDivisionKpis.ts (copy the CRUD pattern from useTracker.ts).
New component src/components/DivisionKpiCard.tsx — progress bars (current/target), edit inline for that division's Kadep/Wakadep (reuse EditableCell), read-only for others.
Where it shows:
Dashboard / — DashboardOverview.tsx: a "KPI Divisi" section, colored with getDivisionColor.
/division/:division — DivisionView.tsx: that division's own KPI card with edit access.
Permission: edit = isLeader(member) && member.division === division ∥ admin.
Routes: no new route.
F4. Perintah / task assignment in Lapak Kerja (Pembagian Tugas) + notification
DB migration — extend the existing table:
alter table lapak_tasks add column assigned_member_id uuid references members(id) on delete set null;
alter table lapak_tasks add column assigned_by text default '';
(pic text stays for display/back-compat.)

src/hooks/useLapak.ts:8 — add the two fields to LapakTask; add useMyAssignedTasks(memberId) query (lapak_tasks where assigned_member_id = me and done = false, joined with proker name).
TasksTab.tsx — replace the free-text PIC cell with a member Select (members of the proker's division + collab divisions); on assign, set assigned_member_id + pic (name) + assigned_by (current leader's name). Only Kadep/Wakadep/admin can assign; the assigned member can toggle done and edit notes on their own rows.
Notification: useMyNotifications (F2) surfaces "Kamu ditugaskan: {tugas} — {proker} (deadline {date})" in the bell; clicking navigates to /lapak-kerja (existing route) with the proker preselected — check how LapakKerjaPage selects a proker (likely state or query param; add ?proker=<id> support if absent).
Routes: no new route; possibly add query-param handling on /lapak-kerja.
F5. Keuangan — org-wide ledger
DB migration:
create table finance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  description text not null,
  kind text not null check (kind in ('income','expense')),
  amount numeric not null,
  category text default '',
  notes text default '',
  created_by text default '',
  created_at timestamptz default now()
);
New route: /keuangan → new page src/pages/KeuanganPage.tsx, registered in App.tsx:85 and added to AppSidebar.tsx nav.
New hook src/hooks/useFinance.ts (same CRUD pattern).
Page: summary cards (total masuk, total keluar, saldo), table of entries with running balance, month filter, CSV export (reuse csv.ts).
Permission: edit = isBendahara ∥ isBPH ∥ admin; view = everyone.
F6. Birthday notifications
DB migration: alter table members add column birth_date date;
useMemberStore.ts — add birthDate to Member, rowToMember, the two select(...) strings, and the profile update mutation.
Members page / claim flow — add a date input so members fill their own birthday.
Notification: in useMyNotifications, compare MM-DD of each member's birth_date to today → "🎂 {name} ({division}) ulang tahun hari ini!" for everyone. Plus a dashboard banner on / (DashboardOverview).
Routes: no new route.
F7. Bendahara comments on RAB
DB migration — one generic comments table covering F7 + F8:
create table lapak_comments (
  id uuid primary key default gen_random_uuid(),
  proker_id uuid not null references prokers(id) on delete cascade,
  scope text not null default 'general',  -- 'rab' | 'general'
  author_name text not null,
  author_position text not null,
  body text not null,
  created_at timestamptz default now()
);
New hook src/hooks/useLapakComments.ts (pattern from useOngoingComments.ts).
New component src/components/lapak/CommentThread.tsx (author + position badge + timestamp, textarea for allowed roles).
RabTab.tsx — render <CommentThread scope="rab">; write access = Bendahara ∥ admin. Division members see comments read-only.
F8. Sekretaris comments on Lapak Kerja (whole lapak, not RAB)
Same table/component as F7 with scope='general'.
Render one general <CommentThread scope="general"> on the Lapak Kerja detail (as a "Komentar" section or tab next to Notes — I'd put it at the bottom of the page shell so it spans all tabs).
Write access = Secretary ∥ admin (Bendahara only on the RAB thread, per your answer). Everyone in the division reads.
Routes: no new route.
Suggested build order
F1 Bendahara position (tiny, unblocks F5/F7)
F6 birth_date column + profile field (tiny)
F4 task assignment (schema + TasksTab)
F2 derived notifications bell (needs F4 + F6 data)
F7 + F8 comments (one table, one component, two mount points)
F3 KPI cards
F5 /keuangan page (fully independent, can go anytime)
DB migrations needed (run in Supabase SQL editor): 4 new tables/columns total — division_kpis, finance_entries, lapak_comments, plus alter on members and lapak_tasks. All with open RLS to match the app's existing model (permissions UI-enforced).