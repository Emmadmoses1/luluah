import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { cancelOrder, updateOrder } from "@/app/(admin)/admin/order-actions";

const ERR: Record<string, string> = {
  cancelled: "This order is cancelled and can no longer be changed.",
  state: "Shipped, delivered or already-cancelled orders cannot be cancelled.",
  paid: "This order has a confirmed or confirming payment. Refunds are not available yet, so it cannot be cancelled here.",
  missing: "Order not found.",
};
const bhd = (m: string) => (Number(m) / 1000).toFixed(3);

export default async function OrderDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [o] = await sql<{ ref: string; fulfillment_status: string; payment_status: string; is_test: boolean;
    subtotal_minor: string; shipping_minor: string; total_minor: string; currency_code: string; customer_name: string;
    customer_email: string | null; customer_phone: string; country_iso2: string; address: Record<string, string>;
    notes: string | null; tracking_ref: string | null; admin_notes: string | null; created_at: Date }[]>`
    select ref, fulfillment_status, payment_status, is_test, subtotal_minor, shipping_minor, total_minor, currency_code,
           customer_name, customer_email, customer_phone, country_iso2, address, notes, tracking_ref, admin_notes, created_at
    from orders where id = ${id}`;
  if (!o) notFound();
  const items = await sql<{ product_name: string; variant_label: string | null; sku: string; unit_minor: string; qty: number; line_minor: string }[]>`
    select product_name, variant_label, sku, unit_minor, qty, line_minor from order_items where order_id = ${id}`;
  const input = "mt-1 w-full border rounded px-3 py-2 bg-white";
  const locked = o.fulfillment_status === "cancelled";

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/orders" className="text-sm underline">← All orders</Link>
      <h1 className="text-2xl font-semibold font-mono">LU-{o.ref.slice(0, 4)}-{o.ref.slice(4, 8)}-{o.ref.slice(8)}
        {o.is_test && <span className="ml-2 text-xs bg-amber-100 px-1 font-sans">test order</span>}</h1>
      {q.saved && <p className="bg-green-100 text-green-900 p-2 rounded text-sm">Saved.</p>}
      {q.error && <p className="bg-red-100 text-red-900 p-2 rounded text-sm">{ERR[q.error] ?? "Could not complete the action."}</p>}

      <div className="bg-white rounded shadow p-4 grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold mb-1">Customer</p>
          <p dir="auto">{o.customer_name}</p><p dir="ltr">{o.customer_phone}</p>{o.customer_email && <p dir="ltr">{o.customer_email}</p>}
          <p className="mt-2 text-neutral-500">Placed {o.created_at.toISOString().slice(0, 16).replace("T", " ")} UTC</p>
        </div>
        <div>
          <p className="font-semibold mb-1">Delivery address ({o.country_iso2})</p>
          {Object.entries(o.address).map(([k, v]) => <p key={k} dir="auto"><span className="text-neutral-400">{k}:</span> {v}</p>)}
          {o.notes && <p className="mt-2" dir="auto"><span className="text-neutral-400">customer note:</span> {o.notes}</p>}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 text-sm">
        <table className="w-full">
          <thead className="text-left text-neutral-500"><tr><th className="py-1">Item</th><th>SKU</th><th>Unit</th><th>Qty</th><th>Line</th></tr></thead>
          <tbody>
            {items.map((i, n) => (
              <tr key={n} className="border-t"><td className="py-1" dir="auto">{i.product_name}{i.variant_label ? ` (${i.variant_label})` : ""}</td>
                <td>{i.sku}</td><td>{bhd(i.unit_minor)}</td><td>{i.qty}</td><td>{bhd(i.line_minor)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-right">Subtotal {bhd(o.subtotal_minor)} · Shipping {bhd(o.shipping_minor)} · <b>Total {bhd(o.total_minor)} {o.currency_code}</b></p>
        <p className="mt-1 text-right text-neutral-500">Payment status: {o.payment_status}</p>
      </div>

      <form action={updateOrder} className="bg-white rounded shadow p-4 space-y-3">
        <input type="hidden" name="id" value={id} />
        <label className="block text-sm">Fulfillment status
          <select name="fulfillment_status" defaultValue={locked ? "new" : o.fulfillment_status} disabled={locked} className={input}>
            <option value="new">New</option><option value="processing">Processing</option>
            <option value="shipped">Shipped</option><option value="delivered">Delivered</option>
          </select></label>
        <label className="block text-sm">Tracking reference
          <input name="tracking_ref" defaultValue={o.tracking_ref ?? ""} disabled={locked} className={input} /></label>
        <label className="block text-sm">Internal notes (never shown to the customer)
          <textarea name="admin_notes" rows={3} defaultValue={o.admin_notes ?? ""} disabled={locked} className={input} /></label>
        {!locked && <button className="bg-neutral-900 text-white px-5 py-2 rounded">Save changes</button>}
      </form>

      {!locked && (
        <form action={cancelOrder} className="bg-white rounded shadow p-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm mb-2">Cancelling returns the reserved stock to inventory. Shipped, delivered and paid orders cannot be cancelled here.</p>
          <button className="border border-red-700 text-red-700 px-5 py-2 rounded">Cancel this order</button>
        </form>
      )}
    </div>
  );
}
