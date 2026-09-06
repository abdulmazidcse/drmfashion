-- Adds Coupon.subscribersOnly — restricts a code to emails that appear in the
-- Subscriber table. This is what turns "sign up for our emails and get 15% off"
-- into a real condition: without it the code works for anyone who sees it, and
-- codes shown in the footer and promo popup spread quickly.
--
-- Purely additive: one NOT NULL column with a default, so existing rows get
-- FALSE and keep behaving exactly as they do today. Postgres 11+ stores the
-- default in the catalogue rather than rewriting the table, so this is fast
-- even on a large Coupon table.
--
--   psql "$DIRECT_DATABASE_URL" -f add_coupon_subscribers_only.production.sql
--
-- Safe to re-run: IF NOT EXISTS makes the statement a no-op once applied.

ALTER TABLE "Coupon"
  ADD COLUMN IF NOT EXISTS "subscribersOnly" BOOLEAN NOT NULL DEFAULT false;

-- Turn it on for the signup reward code. Nothing else is touched, so any other
-- campaign code keeps working for everyone.
UPDATE "Coupon" SET "subscribersOnly" = true WHERE UPPER("code") = 'WELCOME15';

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect the column with default false, and WELCOME15 the only row set true:
--
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'Coupon' AND column_name = 'subscribersOnly';
--
--   SELECT "code", "subscribersOnly" FROM "Coupon" ORDER BY "code";
