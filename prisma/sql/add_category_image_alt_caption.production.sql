-- Adds image SEO copy for the two pictures a category carries:
--   imageAlt / imageCaption             — the portrait 5:7 tile used in the
--                                         Trending and Summer grids and the
--                                         category cards.
--   bannerImageAlt / bannerImageCaption — the wide 3:1 artwork at the top of
--                                         /category/[slug].
--
-- Separate fields per picture because they are two different photographs; they
-- previously shared a single alt built from the category name, which described
-- the same picture twice to a screen reader.
--
-- Alt falls back to a generated line when empty ("Button Shirts category") —
-- see categoryImageAlt in lib/imageMeta.ts. Caption has no fallback: it is
-- visible copy, so an empty one simply renders nothing.
--
-- Purely additive: four nullable columns, no rewrite of existing rows. Run it
-- BEFORE deploying the code that reads them — Prisma selects these columns on
-- every category query, so the app errors against a database without them.
--
--   psql "$DIRECT_DATABASE_URL" -f add_category_image_alt_caption.production.sql
--
-- Safe to re-run: IF NOT EXISTS makes each statement a no-op once applied.

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "imageAlt" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "bannerImageAlt" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "imageCaption" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "bannerImageCaption" TEXT;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect four rows, all text and is_nullable = YES:
--
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'Category'
--     AND column_name IN ('imageAlt', 'bannerImageAlt', 'imageCaption', 'bannerImageCaption');
--
-- Nothing changes on the storefront until an editor fills the fields in; until
-- then every category image keeps its generated alt and shows no caption.
