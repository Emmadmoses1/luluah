import Link from "next/link";
import { sql } from "@/lib/db";

export default async function Orders() {
  const rows = await sql<{ id: string; ref: string; customer_name: string; country_iso2: string; total_minor: string;
    payment_status: string; fulfillment_status: string; is_test: boolean; created_at: Date }[]>`
    select id, ref, customer_name, country_iso2, total_minor, payment_status, fulfillment_status, is_test, created_at
    from orders order by created_at desc limit 100`;
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Orders</h1>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr><th className="p-3">Reference</th><th className="p-3">Customer</th><th className="p-3">Country</th>
              <th className="p-3">Total (BHD)</th><th className="p-3">Payment</th><th className="p-3">Fulfillment</th><th className="p-3">Date</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-3 text-neutral-500" colSpan={7}>No orders yet.</td></tr>}
            {rows.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3"><Link className="underline font-mono" href={`/admin/orders/${o.id}`}>LU-{o.ref.slice(0, 4)}-{o.ref.slice(4, 8)}-{o.ref.slice(8)}</Link>
                  {o.is_test && <span className="ml-2 text-xs bg-amber-100 px-1">test</span>}</td>
                <td className="p-3" dir="auto">{o.customer_name}</td>
                <td className="p-3">{o.country_iso2}</td>
                <td className="p-3">{(Number(o.total_minor) / 1000).toFixed(3)}</td>
                <td className="p-3">{o.payment_status}</td>
                <td className="p-3">{o.fulfillment_status}</td>
                <td className="p-3">{o.created_at.toISOString().slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
