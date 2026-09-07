import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const rows: any[] = await p.$queryRawUnsafe(`
    SELECT 'Product.thumbnail' AS src, count(*)::int AS total,
      count(*) FILTER (WHERE thumbnail ~* '^https?://')::int AS fullurl,
      count(*) FILTER (WHERE thumbnail LIKE '/%')::int AS abs_rel,
      count(*) FILTER (WHERE thumbnail !~* '^https?://' AND thumbnail NOT LIKE '/%' AND thumbnail<>'')::int AS bare
    FROM "Product" WHERE thumbnail IS NOT NULL
    UNION ALL
    SELECT 'ProductImage.url', count(*)::int,
      count(*) FILTER (WHERE url ~* '^https?://')::int,
      count(*) FILTER (WHERE url LIKE '/%')::int,
      count(*) FILTER (WHERE url !~* '^https?://' AND url NOT LIKE '/%' AND url<>'')::int
    FROM "ProductImage"`);
  console.table(rows);
  const s: any[] = await p.$queryRawUnsafe(`SELECT DISTINCT substring(url from '^(https?://[^/]+/[^/]+/)') AS prefix, count(*)::int FROM "ProductImage" GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
  console.table(s);
  const samples: any[] = await p.$queryRawUnsafe(`SELECT url FROM "ProductImage" ORDER BY random() LIMIT 8`);
  console.log(samples);
}
main().finally(()=>p.$disconnect());
