-- Adds the two size-guide columns a category hands down to every product
-- beneath it (see lib/sizeChart.ts):
--   sizeChartTable — the measurements table
--   howToMeasure   — the "how to measure" copy, inherited independently, so a
--                    category may supply one without the other
--
-- Shape stored in the column:
--   { "title": "...", "unit": "in" | "cm",
--     "columns": ["Size", "Your Chest", ...],
--     "rows": [["S Semi Tall", "35-37", ...], ...] }
-- Values are stored in one unit only; the storefront toggle converts.
--
-- Purely additive: two nullable columns, no rewrite of existing rows. Run it
-- before deploying the code that reads them.
--
--   psql "$DIRECT_DATABASE_URL" -f add_category_size_chart.production.sql
--
-- Safe to re-run: IF NOT EXISTS makes each statement a no-op once applied.

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "sizeChartTable" JSONB;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "howToMeasure" TEXT;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect two rows (jsonb and text), both is_nullable = YES:
--
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'Category'
--     AND column_name IN ('sizeChartTable', 'howToMeasure');
--
-- Nothing changes for existing products: a null column means the product falls
-- back exactly as it did before — its own chart image, then the built-in table.
