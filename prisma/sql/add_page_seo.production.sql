-- Adds the three search-engine override columns to Page, matching the ones
-- Category, JournalPost and Product already carry:
--   metaTitle       — replaces the page title in <title> and og:title
--   metaDescription — the <meta name="description"> / og:description
--   metaKeywords    — comma-separated <meta name="keywords">
--
-- All three are optional. A page that leaves them empty keeps the exact
-- metadata it had before: the title falls back to Page.title and the
-- description to the opening text of the page body — see the fallback chain in
-- app/pages/[slug]/page.tsx generateMetadata.
--
-- Purely additive: three nullable columns, no rewrite of existing rows. Run it
-- before deploying the code that reads them.
--
--   psql "$DIRECT_DATABASE_URL" -f add_page_seo.production.sql
--
-- Safe to re-run: IF NOT EXISTS makes each statement a no-op once applied.

ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "metaKeywords" TEXT;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect three rows, all text and is_nullable = YES:
--
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'Page'
--     AND column_name IN ('metaTitle', 'metaDescription', 'metaKeywords');
--
-- Nothing changes for existing pages until an editor fills the fields in from
-- the admin page form; until then every page keeps its current metadata.
