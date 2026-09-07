import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const t: any[] = await p.$queryRawUnsafe(`SELECT thumbnail FROM "Product" WHERE thumbnail NOT LIKE 'http%' AND thumbnail IS NOT NULL`);
  console.log("non-http thumbnails:", t);
  // every text column that looks image-ish across all tables
  const cols: any[] = await p.$queryRawUnsafe(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public'
      AND data_type IN ('text','character varying')
      AND (column_name ILIKE '%image%' OR column_name ILIKE '%thumb%' OR column_name ILIKE '%logo%'
           OR column_name ILIKE '%photo%' OR column_name ILIKE '%avatar%' OR column_name ILIKE '%banner%'
           OR column_name ILIKE '%icon%' OR column_name ILIKE '%url%' OR column_name ILIKE '%media%'
           OR column_name ILIKE '%video%' OR column_name ILIKE '%poster%' OR column_name ILIKE '%cover%')
    ORDER BY 1,2`);
  const hits: any[] = [];
  for (const c of cols) {
    try {
      const r: any[] = await p.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM "${c.table_name}" WHERE "${c.column_name}" ~* '^https?://[^/]+/${process.env.MINIO_BUCKET_NAME || 'fashion-store-bucket'}/'`);
      if (r[0].n > 0) hits.push({ ...c, rows: r[0].n });
    } catch {}
  }
  console.table(hits);
}
main().finally(()=>p.$disconnect());
