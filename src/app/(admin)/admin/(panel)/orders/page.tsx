import Link from "next/link";
import { sql } from "@/lib/db";
import Badge from "@/components/admin/Badge";

export default async function Orders() {
  const rows = await sql<{ id: string; ref: string; customer_name: string; country_iso2: string; total_minor: string;
    currency_code: string; payment_status: string; fulfillment_status: string; is_test: boolean; created_at: Date }[]>`
    select id, ref, customer_name, country_iso2, total_minor, currency_code, payment_status, fulfillment_status, is_test, created_at
    from orders order by created_at desc limit 100`;
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Sales</p>
        <h1 className="text-3xl font-semibold mt-1">Orders</h1>
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Reference</th><th>Customer</th><th>Country</th><th>Total</th><th>Payment</th><th>Fulfillment</th><th>Date</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="text-neutral-500">No orders yet.</td></tr>}
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap"><Link className="font-mono text-[#a8864a] hover:underline" href={`/admin/orders/${o.id}`}>LU-{o.ref.slice(0, 4)}-{o.ref.slice(4, 8)}-{o.ref.slice(8)}</Link>
                  {o.is_test && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">TEST</span>}</td>
                <td dir="auto">{o.customer_name}</td>
                <td>{o.country_iso2}</td>
                <td className="tabular-nums whitespace-nowrap">{(Number(o.total_minor) / 1000).toFixed(3)} {o.currency_code}</td>
                <td><Badge value={o.payment_status} /></td>
                <td><Badge value={o.fulfillment_status} /></td>
                <td className="whitespace-nowrap text-neutral-500">{o.created_at.toISOString().slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
