-- Production variant of add_product_inventory_indexes.sql.
--
-- Run with psql WITHOUT --single-transaction: CREATE INDEX CONCURRENTLY cannot
-- run inside a transaction block, and psql's default autocommit gives each
-- statement its own. Connect on the DIRECT database URL, not the PgBouncer
-- pooled one — transaction-mode pooling breaks CONCURRENTLY too.
--
--   psql "$DIRECT_DATABASE_URL" -f add_product_inventory_indexes.production.sql
--
-- Safe to re-run: IF NOT EXISTS makes every statement a no-op once the index is
-- there. If a build is interrupted Postgres leaves an INVALID index behind — see
-- the check at the bottom.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_deletedAt_createdAt_idx"
  ON "Product" ("deletedAt", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_categoryId_idx"
  ON "Product" ("categoryId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_brandId_idx"
  ON "Product" ("brandId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductVariant_deletedAt_stock_idx"
  ON "ProductVariant" ("deletedAt", "stock");

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect four rows, all with indisvalid = t:
--
--   SELECT c.relname AS index, i.indisvalid AS valid
--   FROM pg_class c
--   JOIN pg_index i ON i.indexrelid = c.oid
--   WHERE c.relname IN (
--     'Product_deletedAt_createdAt_idx',
--     'Product_categoryId_idx',
--     'Product_brandId_idx',
--     'ProductVariant_deletedAt_stock_idx'
--   );
--
-- Any row with valid = f is a half-built index: it is ignored by the planner
-- but still costs writes. Drop it and re-run this file.
--
--   DROP INDEX CONCURRENTLY IF EXISTS "<name>";
