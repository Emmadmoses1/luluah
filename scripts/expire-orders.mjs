import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const [s] = await sql`select value from store_settings where key = 'payments'`;
const hours = Number(s?.value?.order_expiry_hours) > 0 ? Number(s.value.order_expiry_hours) : 24;
const stale = await sql`
  select id, ref from orders
  where payment_status in ('unpaid','pending') and fulfillment_status = 'new'
    and stock_released = false and created_at < now() - make_interval(hours => ${hours})`;
let n = 0;
for (const o of stale) {
  await sql.begin(async (tx) => {
    const [cur] = await tx`select payment_status, fulfillment_status, stock_released from orders where id = ${o.id} for update`;
    if (!cur || cur.stock_released || cur.fulfillment_status !== "new" || !["unpaid", "pending"].includes(cur.payment_status)) return;
    await tx`update product_variants v set stock = v.stock + i.qty from order_items i where i.order_id = ${o.id} and i.variant_id = v.id`;
    await tx`update orders set payment_status = 'expired', fulfillment_status = 'cancelled', stock_released = true, updated_at = now() where id = ${o.id}`;
    n++;
  });
}
console.log(`Expired ${n} unpaid order(s) older than ${hours}h and restored their stock.`);
await sql.end();
