import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { likeEscape } from "@/lib/arabic";
import Badge from "@/components/admin/Badge";

const bhd = (m: string | number) => (Number(m) / 1000).toFixed(3);
const day = (d: Date) => d.toISOString().slice(0, 10);

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const p = await searchParams;
  const q = (p.q ?? "").trim().slice(0, 60);
  const like = `%${likeEscape(q)}%`;
  const phone = (p.c ?? "").slice(0, 40);

  const rows = await sql<{ phone: string; name: string; email: string | null; country: string; orders: string; paid: string; last: Date }[]>`
    select customer_phone as phone,
      (array_agg(customer_name order by created_at desc))[1] as name,
      (array_agg(customer_email order by created_at desc) filter (where customer_email is not null))[1] as email,
      (array_agg(country_iso2 order by created_at desc))[1] as country,
      count(*) as orders,
      coalesce(sum(total_minor) filter (where payment_status = 'paid' and currency_code = 'BHD'), 0) as paid,
      max(created_at) as last
    from orders
    where not is_test and (${q} = '' or customer_phone ilike ${like} or customer_name ilike ${like} or customer_email ilike ${like})
    group by customer_phone order by max(created_at) desc limit 100`;

  const detail = phone ? await sql<{ id: string; ref: string; total_minor: string; currency_code: string;
    payment_status: string; fulfillment_status: string; created_at: Date }[]>`
    select id, ref, total_minor, currency_code, payment_status, fulfillment_status, created_at
    from orders where customer_phone = ${phone} and not is_test order by created_at desc limit 50` : [];

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">People</p>
        <h1 className="text-3xl font-semibold mt-1">Customers</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">Built from real (non-test) orders and grouped by phone number. Customers check out as guests, so there are no accounts or passwords. Personal details are visible only to owners and managers.</p>
      </div>
      <form className="a-card p-4 flex gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Search name, phone or email" className="a-input flex-1" />
        <button className="a-btn">Search</button>
      </form>

      {phone && (
        <section className="a-card overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold" dir="ltr">Orders for {phone}</h2>
            <Link href={q ? `/admin/customers?q=${encodeURIComponent(q)}` : "/admin/customers"} className="text-sm text-[#a8864a] hover:underline">Close</Link>
          </div>
          <table className="a-table">
            <thead><tr><th>Reference</th><th>Date</th><th>Total</th><th>Payment</th><th>Fulfillment</th></tr></thead>
            <tbody>
              {detail.map((o) => (
                <tr key={o.id}>
                  <td><Link className="font-mono text-[#a8864a] hover:underline" href={`/admin/orders/${o.id}`}>LU-{o.ref.slice(0, 4)}-{o.ref.slice(4, 8)}-{o.ref.slice(8)}</Link></td>
                  <td>{day(o.created_at)}</td><td className="tabular-nums">{bhd(o.total_minor)} {o.currency_code}</td>
                  <td><Badge value={o.payment_status} /></td><td><Badge value={o.fulfillment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Country</th><th>Orders</th><th>Paid (BHD)</th><th>Last order</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="text-neutral-500">No customers yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.phone}>
                <td dir="auto">{r.name}</td>
                <td dir="ltr"><Link className="text-[#a8864a] hover:underline" href={`/admin/customers?c=${encodeURIComponent(r.phone)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>{r.phone}</Link></td>
                <td dir="ltr" className="break-all">{r.email ?? "—"}</td><td>{r.country}</td>
                <td>{r.orders}</td><td className="tabular-nums">{bhd(r.paid)}</td><td className="whitespace-nowrap">{day(r.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
