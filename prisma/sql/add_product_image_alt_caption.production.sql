-- Adds the two image-SEO columns to ProductImage:
--   alt     — alt text for one gallery shot. Empty falls back to a generated
--             one built from the product title and colourway (lib/imageMeta.ts).
--   caption — optional visible copy under the shot in the gallery.
--
-- Variant photos gained the same two fields, but they live inside the existing
-- ProductVariant.images JSON column, so they need no schema change here.
--
-- Purely additive: two nullable columns, no rewrite of existing rows. Run it
-- BEFORE deploying the code that reads them — Prisma selects these columns on
-- every product query, so the app errors against a database without them.
--
--   psql "$DIRECT_DATABASE_URL" -f add_product_image_alt_caption.production.sql
--
-- Safe to re-run: IF NOT EXISTS makes each statement a no-op once applied.

ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "alt" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "caption" TEXT;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect two rows, both text and is_nullable = YES:
--
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'ProductImage' AND column_name IN ('alt', 'caption');
--
-- Nothing changes for existing images until an editor fills the fields in from
-- the product form; until then every shot keeps its generated alt.
