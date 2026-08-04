-- Indexes backing the admin product and inventory listings.
--
-- Applied by hand rather than through `prisma migrate dev`: this database has
-- drifted from the migration history (it has been evolved with `db push`), and
-- migrate would want to reset the schema to reconcile that. These statements
-- are purely additive, so they are safe to run against an existing database.
--
-- On production run the CONCURRENTLY variants at the bottom instead — a plain
-- CREATE INDEX takes an ACCESS EXCLUSIVE lock and blocks writes to the table
-- for the duration of the build.

CREATE INDEX IF NOT EXISTS "Product_deletedAt_createdAt_idx"
  ON "Product" ("deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Product_categoryId_idx"
  ON "Product" ("categoryId");

CREATE INDEX IF NOT EXISTS "Product_brandId_idx"
  ON "Product" ("brandId");

CREATE INDEX IF NOT EXISTS "ProductVariant_deletedAt_stock_idx"
  ON "ProductVariant" ("deletedAt", "stock");

-- Production (run one at a time, outside a transaction):
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_deletedAt_createdAt_idx"
--   ON "Product" ("deletedAt", "createdAt");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_categoryId_idx"
--   ON "Product" ("categoryId");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_brandId_idx"
--   ON "Product" ("brandId");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductVariant_deletedAt_stock_idx"
--   ON "ProductVariant" ("deletedAt", "stock");
