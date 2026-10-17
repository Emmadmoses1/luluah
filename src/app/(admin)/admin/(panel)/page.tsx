import Link from "next/link";
import { sql } from "@/lib/db";
import Badge from "@/components/admin/Badge";

const bhd = (m: string | number) => (Number(m) / 1000).toFixed(3);

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const q = await searchParams;
  const [c] = await sql<{ published: string; draft: string; demo: string }[]>`
    select count(*) filter (where status = 'published') as published,
           count(*) filter (where status = 'draft') as draft,
           count(*) filter (where is_demo) as demo from products`;
  const [l] = await sql<{ n: string }[]>`
    select count(*) as n from product_variants v join products p on p.id = v.product_id
    where p.status = 'published' and v.stock <= 3`;
  const [o] = await sql<{ total: string; pending: string; paid: string; failed: string; revenue: string; tests: string }[]>`
    select count(*) filter (where not is_test) as total,
      count(*) filter (where not is_test and payment_status in ('unpaid','pending','confirming','partially_paid')) as pending,
      count(*) filter (where not is_test and payment_status = 'paid') as paid,
      count(*) filter (where not is_test and payment_status in ('failed','expired')) as failed,
      coalesce(sum(total_minor) filter (where not is_test and payment_status = 'paid' and currency_code = 'BHD'), 0) as revenue,
      count(*) filter (where is_test) as tests from orders`;
  const days = await sql<{ d: string; n: string }[]>`
    select to_char(g, 'MM-DD') as d, coalesce(sum(o.total_minor), 0) as n
    from generate_series(current_date - 6, current_date, interval '1 day') g
    left join orders o on o.created_at::date = g::date and not o.is_test and o.payment_status = 'paid' and o.currency_code = 'BHD'
    group by g order by g`;
  const top = await sql<{ name_ar: string; qty: string }[]>`
    select p.name_ar, sum(oi.qty) as qty
    from order_items oi join orders o on o.id = oi.order_id
      join product_variants v on v.id = oi.variant_id join products p on p.id = v.product_id
    where o.payment_status = 'paid' and not o.is_test
    group by p.id order by sum(oi.qty) desc limit 5`;
  const recent = await sql<{ id: string; ref: string; customer_name: string; total_minor: string; currency_code: string;
    payment_status: string; is_test: boolean }[]>`
    select id, ref, customer_name, total_minor, currency_code, payment_status, is_test from orders order by created_at desc limit 6`;

  const max = Math.max(1, ...days.map((d) => Number(d.n)));
  const kpis: [string, string, string][] = [
    ["Revenue (BHD, paid, real orders)", bhd(o.revenue), "#c9a96e"],
    ["Total orders", o.total, "#0c0a09"],
    ["Pending payment", o.pending, "#d97706"],
    ["Paid orders", o.paid, "#059669"],
    ["Failed / expired", o.failed, "#b91c1c"],
    ["Low-stock variants (≤ 3)", l.n, "#b91c1c"],
    ["Published products", c.published, "#a8864a"],
    ["Test orders (excluded above)", o.tests, "#737373"],
  ];
  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Overview</p>
        <h1 className="text-3xl font-semibold mt-1">Dashboard</h1>
      </div>
      {q.denied && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">You don’t have permission to open that page.</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(([t, n, color], i) => (
          <div key={t} style={{ animationDelay: `${i * 60}ms`, borderTopColor: color }}
            className="admin-card a-card border-t-4 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500 leading-4">{t}</p>
            <p className="text-3xl font-semibold mt-3 tabular-nums">{n}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="a-card p-6 lg:col-span-2">
          <h2 className="font-semibold">Paid revenue, last 7 days (BHD)</h2>
          <div className="mt-6 flex items-end gap-3 h-44" role="img" aria-label="Revenue per day for the last seven days">
            {days.map((d) => (
              <div key={d.d} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                <span className="text-[10px] text-neutral-500 tabular-nums">{Number(d.n) ? bhd(d.n) : ""}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-[#a8864a] to-[#e3c88d] transition-all duration-700"
                  style={{ height: `${Math.max(4, (Number(d.n) / max) * 100)}%`, opacity: Number(d.n) ? 1 : 0.25 }} />
                <span className="text-[10px] text-neutral-400">{d.d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="a-card p-6">
          <h2 className="font-semibold">Top sellers (paid orders)</h2>
          {top.length === 0 ? <p className="mt-4 text-sm text-neutral-500">No paid orders yet.</p> : (
            <ol className="mt-4 space-y-3 text-sm">
              {top.map((t, i) => (
                <li key={t.name_ar} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#faf6ee] text-[#a8864a] grid place-items-center text-xs font-bold">{i + 1}</span>
                  <span dir="rtl" className="flex-1 truncate">{t.name_ar}</span>
                  <span className="tabular-nums text-neutral-500">{t.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="a-card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm text-[#a8864a] hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="a-table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Total</th><th>Payment</th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={4} className="text-neutral-500">No orders yet.</td></tr>}
              {recent.map((r) => (
                <tr key={r.id}>
                  <td><Link className="font-mono text-[#a8864a] hover:underline" href={`/admin/orders/${r.id}`}>LU-{r.ref.slice(0, 4)}-{r.ref.slice(4, 8)}-{r.ref.slice(8)}</Link>
                    {r.is_test && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">TEST</span>}</td>
                  <td dir="auto">{r.customer_name}</td>
                  <td className="tabular-nums">{bhd(r.total_minor)} {r.currency_code}</td>
                  <td><Badge value={r.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <style>{`.admin-card{opacity:0;animation:fade-up .7s cubic-bezier(.22,.8,.24,1) forwards}`}</style>
    </>
  );
}
