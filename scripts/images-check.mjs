import postgres from "postgres";
import { readFile } from "node:fs/promises";

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const rows = await sql`select i.path, i.thumb_path, p.slug from product_images i join products p on p.id = i.product_id`;
let bad = 0;
for (const r of rows) {
  for (const rel of [r.path, r.thumb_path].filter(Boolean)) {
    try {
      const b = await readFile(`public${rel}`);
      if (!(b.length > 5000 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)) throw new Error("not a valid JPEG");
    } catch (e) { bad++; console.error(`BROKEN ${r.slug}: ${rel} (${e.code ?? e.message})`); }
  }
}
const [m] = await sql`select count(*) as n from products p where status = 'published'
  and not exists (select 1 from product_images i where i.product_id = p.id)`;
console.log(`${rows.length} image record(s) checked, ${bad} broken file(s).`);
console.log(`${m.n} published product(s) have no image (the storefront shows a placeholder).`);
await sql.end();
process.exit(bad ? 1 : 0);
