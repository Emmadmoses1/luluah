import postgres from "postgres";

const yes = process.argv.includes("--yes");
const url = process.env.DATABASE_URL;
if (!url || url.includes("PASTE_")) { console.error("DATABASE_URL is missing. Edit .env first."); process.exit(1); }
const sql = postgres(url, { max: 1, onnotice: () => {} });

const [c] = await sql`select
  (select count(*) from products where is_demo) as demo_products,
  (select count(*) from orders where is_test) as test_orders,
  (select count(*) from reviews r join products p on p.id = r.product_id where p.is_demo) as demo_reviews,
  (select count(*) from order_items oi join orders o on o.id = oi.order_id join product_variants v on v.id = oi.variant_id
     join products p on p.id = v.product_id where p.is_demo and not o.is_test) as real_order_lines`;

console.log("Found:");
console.log(`  demo products:                      ${c.demo_products}  (with their variants, images, reviews)`);
console.log(`  test orders:                        ${c.test_orders}  (with their items and payment records)`);
console.log(`  reviews on demo products:           ${c.demo_reviews}`);
console.log(`  real order lines using demo items:  ${c.real_order_lines}  (kept, but they lose the link to the product)`);

if (!yes) {
  console.log("\nDry run: nothing was changed. To delete all of the above, run:\n  npm run demo:remove -- --yes");
  await sql.end();
  process.exit(0);
}

await sql.begin(async (tx) => {
  await tx`delete from payment_events where payment_id in
    (select p.id from payments p join orders o on o.id = p.order_id where o.is_test)`;
  await tx`delete from orders where is_test`;
  const imgs = await tx`select i.path from product_images i join products p on p.id = i.product_id
    where p.is_demo and i.path like '/media/%'`;
  await tx`delete from products where is_demo`;
  for (const { path } of imgs) {
    const id = path.slice("/media/".length);
    if (/^[0-9a-f-]{36}$/.test(id)) await tx`delete from media where id = ${id}`;
  }
  await tx`update store_settings set value = jsonb_set(value, '{show_demo_notice}', 'false'::jsonb) where key = 'store'`;
});

const [after] = await sql`select (select count(*) from products) as products, (select count(*) from orders) as orders`;
console.log(`\nDone. The database now has ${after.products} products and ${after.orders} orders.`);
await sql.end();
