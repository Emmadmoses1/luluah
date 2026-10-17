import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";

const key = process.env.PIXABAY_API_KEY;
if (!key || key.includes("your-pixabay-key")) {
  console.error("PIXABAY_API_KEY is missing. Get a free key at https://pixabay.com/api/docs/ and add it to .env");
  process.exit(1);
}
const PER_PRODUCT = 2;
const UA = { "User-Agent": "LuluahStore/1.0 (product image downloader)" };
const QUERIES = {
  abayas: "abaya woman", "hijab-shawls": "hijab scarf", "modest-dresses": "long dress woman",
  thobes: "thobe man arab", "mens-fashion": "men fashion", "womens-fashion": "women fashion elegant",
  kids: "kids clothing", bags: "leather handbag", shoes: "luxury shoes", watches: "wrist watch",
  jewelry: "pearl necklace", accessories: "fashion accessories", perfumes: "perfume bottle",
  "oud-incense": "incense burner", gifts: "gift box luxury", loungewear: "silk robe",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, tries = 3) {
  for (let a = 1; ; a++) {
    try { return await fn(); }
    catch (e) { if (a >= tries || e.fatal) throw e; await sleep(1500 * a * a); }
  }
}
async function search(q) {
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}` +
    `&image_type=photo&orientation=vertical&safesearch=true&per_page=30`;
  const r = await fetch(url, { headers: UA });
  if (r.status === 400 || r.status === 401 || r.status === 403) {
    const e = new Error(`Pixabay rejected the request (HTTP ${r.status}). Check PIXABAY_API_KEY.`); e.fatal = true; throw e;
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()).hits ?? [];
}
async function jpeg(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const b = Buffer.from(await r.arrayBuffer());
  if (!(b.length > 5000 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)) {
    const e = new Error("downloaded file is not a valid JPEG"); e.fatal = true; throw e;
  }
  return b;
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const rows = await sql`
  select p.id, p.slug, p.name_ar, c.slug as cat
  from products p
  join product_categories pc on pc.product_id = p.id
  join categories c on c.id = pc.category_id
  where not exists (select 1 from product_images i where i.product_id = p.id)
  order by p.created_at, c.sort_order`;
const products = [...new Map(rows.map((r) => [r.id, r])).values()];
const used = new Set((await sql`select external_id from product_images where external_id is not null`).map((r) => r.external_id));
const pools = {};
let ok = 0, failed = 0, skipped = 0;
console.log(`${products.length} product(s) without images.`);

for (const p of products) {
  const q = QUERIES[p.cat];
  if (!q) { console.log(`skip   ${p.slug} (no search query for category ${p.cat})`); skipped++; continue; }
  try {
    if (!pools[p.cat]) { pools[p.cat] = await retry(() => search(q)); await sleep(800); }
    const dir = `public/images/products/${p.cat}`;
    await mkdir(dir, { recursive: true });
    let n = 0;
    for (const h of pools[p.cat]) {
      if (n >= PER_PRODUCT) break;
      const ext = `pixabay:${h.id}`;
      if (used.has(ext) || !h.largeImageURL || !h.webformatURL) continue;
      const main = await retry(() => jpeg(h.largeImageURL));
      const card = await retry(() => jpeg(h.webformatURL));
      n++;
      const base = `${p.slug}-${n}`;
      await writeFile(`${dir}/${base}.jpg`, main);
      await writeFile(`${dir}/${base}-card.jpg`, card);
      await sql`insert into product_images
        (product_id, path, thumb_path, alt_ar, sort_order, source_name, source_url, license_note, photographer, photographer_url, external_id)
        values (${p.id}, ${`/images/products/${p.cat}/${base}.jpg`}, ${`/images/products/${p.cat}/${base}-card.jpg`},
                ${p.name_ar}, ${n}, 'Pixabay', ${h.pageURL}, 'Pixabay Content License',
                ${h.user}, ${`https://pixabay.com/users/${h.user}-${h.user_id}/`}, ${ext})`;
      used.add(ext);
      ok++;
      await sleep(600);
    }
    console.log(n >= 1 ? `added  ${p.slug} (${n} image${n > 1 ? "s" : ""})` : `none   ${p.slug} (no unused photos for "${q}")`);
    if (n === 0) skipped++;
  } catch (e) {
    failed++;
    console.error(`FAILED ${p.slug}: ${e.message}`);
    if (e.fatal && /rejected the request/.test(e.message)) break;
  }
}
await sql.end();
console.log(`\nDone. ${ok} image(s) saved, ${failed} failed, ${skipped} skipped.`);
process.exit(failed ? 1 : 0);
