/**
 * One-off migration: strip the storage host out of every stored image URL.
 *
 * Uploads used to be saved as `https://storage.tallplus.co/<bucket>/<key>`, so
 * the storage domain ended up written into hundreds of rows across a dozen
 * columns — including HTML bodies, where editor-inserted <img src> tags carry
 * it too. Changing the domain, the bucket or the scheme then meant a database
 * migration instead of an env-var change.
 *
 * This rewrites `https?://<any host>/<bucket>/<key>` to `/media/<key>`, which
 * next.config.ts resolves against the live MINIO_ENDPOINT at request time.
 * It is a plain pattern replacement, so it fixes bare columns and embedded
 * HTML alike, and it is idempotent — a second run finds nothing left to do.
 *
 *   npx tsx scripts/normalize-image-urls.ts          # dry run, prints counts
 *   npx tsx scripts/normalize-image-urls.ts --apply  # actually writes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const BUCKET = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket";

/**
 * Postgres regex for an absolute bucket URL. The capture is the object key —
 * everything after `/<bucket>/`. POSIX `[:space:]` and the quote/angle
 * characters end the match at whatever delimiter follows it, so a URL sitting
 * inside an `<img src="…">` or a JSON string is matched without its wrapper.
 */
const PATTERN = `https?://[^/[:space:]"'<>]+/${BUCKET}/([^[:space:]"'<>)]+)`;

/** `\1` is the captured key. */
const REPLACEMENT = "/media/\\1";

type Column = { table: string; column: string };

/** Every text-ish column in the schema — cheaper than maintaining a list. */
async function textColumns(): Promise<Column[]> {
  const rows = await prisma.$queryRawUnsafe<{ table_name: string; column_name: string }[]>(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying')
    ORDER BY 1, 2`);

  return rows.map((r) => ({ table: r.table_name, column: r.column_name }));
}

async function main() {
  console.log(`Bucket: ${BUCKET}`);
  console.log(APPLY ? "Mode:   APPLY (writing)\n" : "Mode:   dry run (use --apply to write)\n");

  let total = 0;

  for (const { table, column } of await textColumns()) {
    const ref = `"${table}"."${column}"`;

    const [{ n }] = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM "${table}" WHERE ${ref} ~ $1`,
      PATTERN
    );
    if (!n) continue;

    total += n;
    console.log(`${String(n).padStart(5)}  ${table}.${column}`);

    if (APPLY) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET ${ref} = regexp_replace(${ref}, $1, $2, 'g') WHERE ${ref} ~ $1`,
        PATTERN,
        REPLACEMENT
      );
    }
  }

  // ProductVariant.images is jsonb, so it is not among information_schema's
  // text columns — cast it, replace, cast back.
  const [{ n: variantRows }] = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "ProductVariant" WHERE "images"::text ~ $1`,
    PATTERN
  );
  if (variantRows) {
    total += variantRows;
    console.log(`${String(variantRows).padStart(5)}  ProductVariant.images (json)`);

    if (APPLY) {
      await prisma.$executeRawUnsafe(
        `UPDATE "ProductVariant"
         SET "images" = regexp_replace("images"::text, $1, $2, 'g')::jsonb
         WHERE "images"::text ~ $1`,
        PATTERN,
        REPLACEMENT
      );
    }
  }

  console.log(
    total === 0
      ? "\nNothing to do — no absolute bucket URLs left."
      : `\n${total} row(s) ${APPLY ? "updated." : "would be updated."}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
