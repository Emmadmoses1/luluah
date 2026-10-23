import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { cancelOrder, updateOrder } from "@/app/(admin)/admin/order-actions";
import { resendInvoice } from "@/app/(admin)/admin/email-actions";
import Badge from "@/components/admin/Badge";
import Field from "@/components/admin/Field";

const ERR: Record<string, string> = {
  cancelled: "This order is cancelled and can no longer be changed.",
  state: "Shipped, delivered or already-cancelled orders cannot be cancelled.",
  paid: "This order has a confirmed or confirming payment. Refunds are not available yet, so it cannot be cancelled here.",
  missing: "Order not found.",
};
const bhd = (m: string) => (Number(m) / 1000).toFixed(3);
const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—");
const trim = (s: string | null) => (s === null ? "—" : s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""));

export default async function OrderDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [o] = await sql<{ ref: string; fulfillment_status: string; payment_status: string; is_test: boolean;
    subtotal_minor: string; discount_minor: string; discount_code: string | null; shipping_minor: string; total_minor: string;
    currency_code: string; customer_name: string; customer_email: string | null; customer_phone: string; country_iso2: string;
    address: Record<string, string>; notes: string | null; tracking_ref: string | null; admin_notes: string | null;
    created_at: Date; paid_at: Date | null }[]>`
    select ref, fulfillment_status, payment_status, is_test, subtotal_minor, discount_minor, discount_code, shipping_minor,
           total_minor, currency_code, customer_name, customer_email, customer_phone, country_iso2, address, notes,
           tracking_ref, admin_notes, created_at, paid_at
    from orders where id = ${id}`;
  if (!o) notFound();
  const items = await sql<{ product_name: string; variant_label: string | null; sku: string; unit_minor: string; qty: number; line_minor: string }[]>`
    select coalesce(p.name_en, oi.product_name) as product_name,
           coalesce(nullif(concat_ws(' · ', v.size, coalesce(v.color_en, v.color_ar)), ''), oi.variant_label) as variant_label,
           oi.sku, oi.unit_minor, oi.qty, oi.line_minor
    from order_items oi left join product_variants v on v.id = oi.variant_id left join products p on p.id = v.product_id
    where oi.order_id = ${id}`;
  const pays = await sql<{ id: string; provider: string; status: string; provider_invoice_id: string | null; price_amount: string;
    price_currency: string; pay_currency: string | null; pay_amount: string | null; actually_paid: string | null;
    expires_at: Date | null; created_at: Date; updated_at: Date }[]>`
    select id, provider, status, provider_invoice_id, price_amount, price_currency, pay_currency, pay_amount, actually_paid,
           expires_at, created_at, updated_at from payments where order_id = ${id} order by created_at desc`;
  const events = pays.length === 0 ? [] : await sql<{ status: string | null; note: string | null; received_at: Date }[]>`
    select status, note, received_at from payment_events
    where payment_id in ${sql(pays.map((p) => p.id))} order by received_at desc limit 30`;
  const locked = o.fulfillment_status === "cancelled";
  const ref = `LU-${o.ref.slice(0, 4)}-${o.ref.slice(4, 8)}-${o.ref.slice(8)}`;

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/admin/orders" className="text-sm text-[#a8864a] hover:underline">← All orders</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold font-mono">{ref}</h1>
        <Badge value={o.payment_status} /><Badge value={o.fulfillment_status} />
        {o.is_test && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">TEST ORDER</span>}
      </div>
      {q.saved && <p role="status" className="rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{ERR[q.error] ?? "Could not complete the action."}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="a-card overflow-hidden">
            <h2 className="px-5 py-4 font-semibold">Items</h2>
            <div className="overflow-x-auto">
              <table className="a-table">
                <thead><tr><th>Item</th><th>SKU</th><th>Unit</th><th>Qty</th><th>Line</th></tr></thead>
                <tbody>
                  {items.map((i, n) => (
                    <tr key={n}>
                      <td dir="auto">{i.product_name}{i.variant_label ? ` (${i.variant_label})` : ""}</td>
                      <td className="font-mono text-xs">{i.sku}</td><td className="tabular-nums">{bhd(i.unit_minor)}</td>
                      <td>{i.qty}</td><td className="tabular-nums">{bhd(i.line_minor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-neutral-100 text-sm space-y-1 text-right">
              <p>Subtotal {bhd(o.subtotal_minor)}</p>
              {Number(o.discount_minor) > 0 && <p className="text-emerald-700">Discount{o.discount_code ? ` (${o.discount_code})` : ""} −{bhd(o.discount_minor)}</p>}
              <p>Shipping {bhd(o.shipping_minor)}</p>
              <p className="text-lg font-semibold">Total {bhd(o.total_minor)} {o.currency_code}</p>
            </div>
          </section>

          <section className="a-card overflow-hidden">
            <h2 className="px-5 py-4 font-semibold">Payments</h2>
            {pays.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-neutral-500">No provider payment for this order (it was paid from the customer wallet, or payment has not started).</p>
            ) : (
              <div className="px-5 pb-5 space-y-4">
                {pays.map((p) => (
                  <div key={p.id} className="rounded-xl border border-neutral-200 p-4 text-sm grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    <p><span className="a-label">Provider</span>{p.provider}</p>
                    <p><span className="a-label">Status</span><Badge value={p.status} /></p>
                    <p><span className="a-label">Requested</span>{trim(p.price_amount)} {p.price_currency}</p>
                    <p><span className="a-label">Crypto / network</span>{p.pay_currency ?? "not chosen yet"}</p>
                    <p><span className="a-label">Amount to pay</span>{trim(p.pay_amount)}</p>
                    <p><span className="a-label">Actually paid</span>{trim(p.actually_paid)}</p>
                    <p className="sm:col-span-2 break-all"><span className="a-label">Provider invoice ID</span><span className="font-mono text-xs">{p.provider_invoice_id ?? "—"}</span></p>
                    <p><span className="a-label">Created</span>{fmt(p.created_at)}</p>
                    <p><span className="a-label">Expires</span>{fmt(p.expires_at)}</p>
                  </div>
                ))}
                <div>
                  <h3 className="a-label mb-2">Payment event history</h3>
                  {events.length === 0 ? <p className="text-sm text-neutral-500">No events received yet.</p> : (
                    <ul className="text-sm divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                      {events.map((e, i) => (
                        <li key={i} className="px-4 py-2 flex flex-wrap items-center gap-3">
                          <span className="text-neutral-500 text-xs tabular-nums">{fmt(e.received_at)}</span>
                          {e.status && <Badge value={e.status} />}
                          {e.note && <span className="text-neutral-600">{e.note}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {o.paid_at && <p className="px-5 pb-5 text-xs text-neutral-500">Confirmed paid at {fmt(o.paid_at)}</p>}
            {o.payment_status === "paid" && o.customer_email && (
              <form action={resendInvoice} className="px-5 pb-5"><input type="hidden" name="id" value={id} /><button className="a-btn-ghost">Email the invoice to the customer</button></form>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="a-card p-5 text-sm space-y-4">
            <div>
              <h2 className="font-semibold mb-2">Customer</h2>
              <p dir="auto">{o.customer_name}</p><p dir="ltr">{o.customer_phone}</p>
              {o.customer_email && <p dir="ltr" className="break-all">{o.customer_email}</p>}
              <p className="mt-2 text-neutral-500 text-xs">Placed {fmt(o.created_at)}</p>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Delivery address ({o.country_iso2})</h2>
              {Object.entries(o.address).map(([k, v]) => <p key={k} dir="auto"><span className="text-neutral-400">{k}:</span> {v}</p>)}
              {o.notes && <p className="mt-2" dir="auto"><span className="text-neutral-400">customer note:</span> {o.notes}</p>}
            </div>
          </section>

          <form action={updateOrder} className="a-card p-5 space-y-4">
            <input type="hidden" name="id" value={id} />
            <h2 className="font-semibold">Fulfillment</h2>
            <Field label="Status">
              <select name="fulfillment_status" defaultValue={locked ? "new" : o.fulfillment_status} disabled={locked} className="a-input">
                <option value="new">New</option><option value="processing">Processing</option>
                <option value="shipped">Shipped</option><option value="delivered">Delivered</option>
              </select>
            </Field>
            <Field label="Tracking reference"><input name="tracking_ref" defaultValue={o.tracking_ref ?? ""} disabled={locked} className="a-input" /></Field>
            <Field label="Internal notes" hint="Never shown to the customer.">
              <textarea name="admin_notes" rows={3} defaultValue={o.admin_notes ?? ""} disabled={locked} className="a-input" />
            </Field>
            {!locked && <button className="a-btn">Save changes</button>}
          </form>

          {!locked && (
            <form action={cancelOrder} className="a-card p-5">
              <input type="hidden" name="id" value={id} />
              <p className="text-sm mb-3 text-neutral-600">Cancelling returns the reserved stock to inventory. Shipped, delivered and paid orders cannot be cancelled here.</p>
              <button className="rounded-xl border border-red-700 text-red-700 px-5 py-2 text-sm font-semibold hover:bg-red-700 hover:text-white transition-colors">Cancel this order</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
