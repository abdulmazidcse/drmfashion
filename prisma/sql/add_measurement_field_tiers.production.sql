-- Adds MeasurementFieldTier — the size-based price brackets on a measurement
-- field ("Waist 41-42 → +$50"), charged on top of the garment type's base
-- tailoring fee.
--
-- Purely additive: one new table, nothing existing is touched. Run it before
-- deploying the code that reads it.
--
--   psql "$DIRECT_DATABASE_URL" -f add_measurement_field_tiers.production.sql
--
-- Safe to re-run: IF NOT EXISTS / DO-block guards make every statement a no-op
-- once the table is there.

CREATE TABLE IF NOT EXISTS "MeasurementFieldTier" (
    "id"             TEXT NOT NULL,
    "fieldId"        TEXT NOT NULL,
    "minValue"       DOUBLE PRECISION NOT NULL,
    "maxValue"       DOUBLE PRECISION NOT NULL,
    "surchargeType"  "MeasurementSurchargeType" NOT NULL DEFAULT 'FLAT',
    "surchargeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeasurementFieldTier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MeasurementFieldTier_fieldId_idx"
  ON "MeasurementFieldTier" ("fieldId");

-- ADD CONSTRAINT has no IF NOT EXISTS, so guard it by name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MeasurementFieldTier_fieldId_fkey'
  ) THEN
    ALTER TABLE "MeasurementFieldTier"
      ADD CONSTRAINT "MeasurementFieldTier_fieldId_fkey"
      FOREIGN KEY ("fieldId") REFERENCES "MeasurementField"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect one row:
--
--   SELECT to_regclass('"MeasurementFieldTier"') AS table,
--          (SELECT count(*) FROM pg_constraint
--            WHERE conname = 'MeasurementFieldTier_fieldId_fkey') AS fkey;
--
-- Existing made-to-measure products keep working unchanged: a field with no
-- tier rows adds no upcharge, exactly as before.
