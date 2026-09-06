-- Adds Product.productCode — the merchant-facing code that identifies a product
-- to staff. Unique across the catalogue; product titles are deliberately NOT
-- unique, so this (and the slug built from it) is what keeps products apart.
--
-- Purely additive: one nullable column plus its unique index. Existing rows get
-- NULL, and Postgres allows any number of NULLs in a unique index, so nothing
-- collides and no row is rewritten.
--
--   psql "$DIRECT_DATABASE_URL" -f add_product_code.production.sql
--
-- Safe to re-run: IF NOT EXISTS makes each statement a no-op once applied.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_productCode_key" ON "Product" ("productCode");

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect the column (nullable) and one unique index:
--
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name = 'Product' AND column_name = 'productCode';
--
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'Product' AND indexname = 'Product_productCode_key';
--
-- Backfilling is optional — a product with a NULL code keeps working exactly as
-- before. Give codes to existing products from the admin edit form as you go.
