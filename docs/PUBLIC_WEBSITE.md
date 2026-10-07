# Public website: handoff notes

PPI UPM has a public info site (separate repo, `ppi-upm-site`) that reads from this dashboard's Supabase. Admins control what it shows from the dashboard: **sidebar → Public Website** (admin only).

Site repo: https://github.com/FadhieZzen13/ppi-upm-site (private). Clone it next to this repo; its README covers running it.

## How it fits together

```
dashboard (this repo)                     Supabase                         ppi-upm-site
/admin/website  ──rpc site_admin_*──▶  site_settings.content (jsonb)  ◀──GET──  site.tsx
 (password checked in the DB)          site_prokers (publish flags)
                                       public_prokers  (view)          ◀──GET──
                                       public_pengurus (view)          ◀──GET──
```

- Migration: `supabase/migrations/20261007000001_public_site.sql`. Run it in the SQL editor, then set the website password once:
  `select public.site_set_admin_password('...');`
- Every other table in this DB is open to anon writes. The `site_*` tables are **read-only for anon**; writes only go through `site_admin_save_content` / `site_admin_set_proker`, which check the website-admin password (bcrypt, server-side). Keep it that way: don't add insert/update policies to `site_*`.
- `public_prokers` only returns prokers that are **published** and **not drafts** (`lapak_ready`). Internal descriptions/notes are never exposed; only the admin-written public description is.
- Content shape: `src/lib/siteContent.ts` here, mirrored in `ppi-upm-site/src/content.ts` (`SiteContent`). **Change both together.**

Dashboard files: `src/pages/AdminWebsitePage.tsx`, `src/hooks/useSiteAdmin.ts`, `src/lib/siteContent.ts`, route in `src/App.tsx`, link in `src/components/AppSidebar.tsx`.

## UI direction for the public site (read before changing it)

The owner was specific about this, after two rounds of rework:

1. **Structure = ppiunimalaya.id.** It's an informational website, not an app. Pages follow their layout:
   - Header: logo + "PPI Universiti Putra Malaysia", plain text nav on the right.
   - Home: centered "Selamat Datang" + intro paragraph + one button, then a wide group photo; "Divisi Kami" in one white panel (3×3 text grid, logo in the middle cell); "Terbaru" band with image cards; centered footer band.
   - Inner pages (Tentang Kami, Proker, Materi): centered title + intro, then content.
2. **Visual style = this dashboard.** Same tokens (`src/index.css` is copied verbatim apart from the font import), Plus Jakarta Sans, crimson `--primary`, off-white background, the dashboard's shadcn `Card` / `Badge` / `Button` / `Input` (copied into `ppi-upm-site/src/components/ui`), `border-border/60 shadow-card`, 10px radius.
3. **Don't copy the dashboard's *layout*.** No stat-card rows, no icon + title page headers, no sidebar, no "portal" feel. That was tried and rejected.
4. **Don't go "marketing landing page" either.** No big split hero, gradients, dotted textures, decorative bands. Also tried and rejected as "vibecoded". Keep it simple and readable.
5. Long text uses dark body text (`text-foreground/75`), not the red `text-muted-foreground`, which is fine for small labels but hard to read in paragraphs.
6. Copy is Indonesian. Avoid em-dashes in UI text.
7. Empty content shows a quiet "Belum diisi" line (`Pending` in `components/common.tsx`), never skeleton bars, since admins fill content in gradually.

Key site files: `src/site.tsx` (data loading + defaults merge), `src/content.ts` (fallback content, types, division colors), `src/components/common.tsx` (`Container`, `Heading`, `Pending`, `EmptyState`, `ProkerCard`), `src/pages/*`.

## Known gaps / next steps

- **Materi upload is disabled** (`UPLOAD_ENABLED` in `ppi-upm-site/src/pages/MateriPage.tsx`). Needs Supabase Storage + a `materi` table, ideally with admin approval before files go public.
- **Dashboard security:** the admin password is hard-coded in `src/hooks/useMemberStore.ts` and all core tables allow anon read/write/delete (including `members.phone` and `password_hash`). Fix with real auth + RLS, and rotate that password.
- `SITE.location`, organisation name and division colors are still hard-coded in the site (`content.ts`), not admin-editable.
- No dark mode on either app (dark tokens exist but nothing toggles them).
- The public site was checked at 375px and desktop widths; re-check both after layout changes.
