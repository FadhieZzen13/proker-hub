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

- Migrations: `supabase/migrations/20261007000001_public_site.sql`, then `20261008000001_public_site_members.sql` (member cards). Run them in the SQL editor, then set the website password once:
  `select public.site_set_admin_password('...');`
- Every other table in this DB is open to anon writes. The `site_*` tables are **read-only for anon**; writes only go through `site_admin_save_content` / `site_admin_set_proker`, which check the website-admin password (bcrypt, server-side). Keep it that way: don't add insert/update policies to `site_*`.
- `public_prokers` only returns prokers that are **published** and **not drafts** (`lapak_ready`). Internal descriptions/notes are never exposed; only the admin-written public description is.
- Content shape: `src/lib/siteContent.ts` here, mirrored in `ppi-upm-site/src/content.ts` (`SiteContent`). **Change both together.**

Dashboard files: `src/pages/AdminWebsitePage.tsx`, `src/hooks/useSiteAdmin.ts`, `src/lib/siteContent.ts`, route in `src/App.tsx`, link in `src/components/AppSidebar.tsx`.

## UI direction for the public site (read before changing it)

Current direction (Oct 2026), set by the owner:

1. **Theme = the Kabinet Prabhadhara Instagram series** (one post per division). Paper `#FFF8F0` and maroon `#7F272B` are sampled from those photos so the cut-outs blend into the page. Black hand-lettered display type (`font-marker` = Rubik Marker Hatch) for titles and division names only; Plus Jakarta Sans for everything else. Sticker crown (yellow) marks the Kadep, like in the photos. The maroon `pennant` shape comes from the Kabinet artwork.
2. **Home (Beranda):** "Selamat Datang" + intro, then a slow looping strip of all member portraits (`components/MemberStrip.tsx`, uses the small copies in `public/members/thumbs/`; pauses on hover, static with reduced motion), then "Kabinet at a glance" (`components/KabinetGlance.tsx`: 8 divisi / member count / published proker count), then the "Terbaru" band. The Kabinet artwork with the 8 divisions around it lives on **Tentang Kami** only, as a frameless 3x3 grid (`components/KabinetGrid.tsx`, BPH at the top, clockwise).
3. **Division page** (`/divisi/:code`): division photo as the header, about text, **member carousel** (photo, name, batch = `intake`, faculty), division prokers, prev/next division.
4. Information-site structure came from ppiunimalaya.id: simple header with a Divisi dropdown, centered page titles, centered footer band. **Don't** turn it into a dashboard (no stat cards / icon page headers) or a generic landing page (no gradients, split heroes, decorative bands). Both were tried and rejected.
5. Long text uses dark body text (`text-foreground/75`). Copy is Indonesian. No em-dashes in UI text.
6. Empty content shows a quiet "Belum diisi" line (`Pending`), never skeleton bars.

Photos: originals from the IG series, resized for the web (Oct 2026). Division posts are `ppi-upm-site/public/divisions/<code>.jpg` (+ `kabinet.png`, a transparent cut-out of the "mid feed" post: cream background removed, trimmed, tiny footer line dropped); per-member posts are `public/members/<division>-<nickname>.jpg`, listed in `ppi-upm-site/src/team.ts`. The member carousel always shows these photos with the nickname and role printed on them; when the admin turns on member details (and the members migration is run), each photo is matched to a dashboard member in the same division (nickname in name, else a unique Kadep/Wakadep/Bendahara role) to add full name, batch and faculty. A photo URL set in the admin Members tab overrides the bundled photo. New member posts: add the file + a line in `team.ts`.

Key site files: `src/components/KabinetGrid.tsx`, `src/components/MemberStrip.tsx`, `src/pages/DivisionPage.tsx`, `src/site.tsx` (data loading + defaults merge), `src/content.ts` (fallback content, types, division colors), `src/components/common.tsx` (`Container`, `Heading`, `Pending`, `EmptyState`, `ProkerCard`), `src/pages/*`.

## Known gaps / next steps

- **Materi upload is disabled** (`UPLOAD_ENABLED` in `ppi-upm-site/src/pages/MateriPage.tsx`). Needs Supabase Storage + a `materi` table, ideally with admin approval before files go public.
- **Dashboard security:** the admin password is hard-coded in `src/hooks/useMemberStore.ts` and all core tables allow anon read/write/delete (including `members.phone` and `password_hash`). Fix with real auth + RLS, and rotate that password.
- `SITE.location`, organisation name and division colors are still hard-coded in the site (`content.ts`), not admin-editable.
- No dark mode on either app (dark tokens exist but nothing toggles them).
- The public site was checked at 375px and desktop widths; re-check both after layout changes.
