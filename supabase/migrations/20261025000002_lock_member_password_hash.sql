-- Hide members.password_hash from the browser. Login, account claim and registration now go
-- through the member-auth Edge Function (service role), so anon/authenticated never need it.
--
-- A column-level REVOKE does nothing while the role still holds the table-level privilege,
-- so revoke SELECT/INSERT/UPDATE on the whole table and grant them back on every other column.
-- DELETE and the open RLS policies are unchanged.
--
-- NOTE: a column added to members later is NOT visible to anon/authenticated until it is
-- added to these grants (e.g. GRANT SELECT (new_col), INSERT (new_col), UPDATE (new_col) ...).

REVOKE SELECT, INSERT, UPDATE ON public.members FROM anon, authenticated;

GRANT SELECT (id, name, faculty, intake, phone, division, position, birth_date, registered_at)
  ON public.members TO anon, authenticated;
GRANT INSERT (id, name, faculty, intake, phone, division, position, birth_date, registered_at)
  ON public.members TO anon, authenticated;
GRANT UPDATE (id, name, faculty, intake, phone, division, position, birth_date, registered_at)
  ON public.members TO anon, authenticated;

DO $$
DECLARE r TEXT; p TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH p IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE'] LOOP
      IF has_column_privilege(r, 'public.members', 'password_hash', p) THEN
        RAISE EXCEPTION '% still has % on members.password_hash', r, p;
      END IF;
      IF NOT has_column_privilege(r, 'public.members', 'name', p) THEN
        RAISE EXCEPTION '% lost % on members.name', r, p;
      END IF;
    END LOOP;
  END LOOP;
END $$;
