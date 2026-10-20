import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDateRange } from "@/lib/admin-forms";
import Badge from "@/components/admin/Badge";

const bhd = (m: string | number) => (Number(m) / 1000).toFixed(3);

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const r = parseDateRange(q.from, q.to);
  const { from, to } = r;

  const [sum] = r.error ? [{ orders: "0", revenue: "0", discounts: "0" }] : await sql<{ orders: string; revenue: string; discounts: string }[]>`
    select count(*) as orders, coalesce(sum(total_minor), 0) as revenue, coalesce(sum(discount_minor), 0) as discounts
    from orders where not is_test and payment_status = 'paid' and currency_code = 'BHD'
      and created_at::date between ${from}::date and ${to}::date`;
  const byStatus = r.error ? [] : await sql<{ payment_status: string; n: string }[]>`
    select payment_status, count(*) as n from orders
    where not is_test and created_at::date between ${from}::date and ${to}::date group by payment_status order by n desc`;
  const days = r.error ? [] : await sql<{ day: string; orders: string; revenue: string }[]>`
    select to_char(d, 'YYYY-MM-DD') as day, count(o.id) as orders, coalesce(sum(o.total_minor), 0) as revenue
    from generate_series(${from}::date, ${to}::date, interval '1 day') d
    left join orders o on o.created_at::date = d::date and not o.is_test and o.payment_status = 'paid' and o.currency_code = 'BHD'
    group by d order by d desc`;
  const top = r.error ? [] : await sql<{ name_ar: string; qty: string; revenue: string }[]>`
    select coalesce(p.name_en, p.name_ar) as name_ar, sum(oi.qty) as qty, sum(oi.line_minor) as revenue
    from order_items oi join orders o on o.id = oi.order_id
      join product_variants v on v.id = oi.variant_id join products p on p.id = v.product_id
    where o.payment_status = 'paid' and not o.is_test and o.currency_code = 'BHD'
      and o.created_at::date between ${from}::date and ${to}::date
    group by p.id order by sum(oi.qty) desc limit 10`;
  const max = Math.max(1, ...days.map((d) => Number(d.revenue)));

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Insights</p>
        <h1 className="text-3xl font-semibold mt-1">Reports</h1>
        <p className="text-sm text-neutral-600 mt-2">Based on real stored orders only. Test orders and orders in other currencies are excluded from revenue.</p>
      </div>
      <form className="a-card p-4 flex flex-wrap items-end gap-3 mb-6">
        <label className="a-label">From<input type="date" name="from" defaultValue={from} className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" /></label>
        <label className="a-label">To<input type="date" name="to" defaultValue={to} className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" /></label>
        <button className="a-btn">Apply</button>
        {!r.error && <a className="a-btn-ghost" href={`/admin/export/orders?from=${from}&to=${to}`}>Download orders CSV</a>}
      </form>
      {r.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{r.error}</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {([["Paid revenue (BHD)", bhd(sum.revenue)], ["Paid orders", sum.orders],
          ["Average order (BHD)", Number(sum.orders) ? bhd(Math.round(Number(sum.revenue) / Number(sum.orders))) : "—"],
          ["Discounts given (BHD)", bhd(sum.discounts)]] as [string, string][]).map(([t, v]) => (
          <div key={t} className="a-card border-t-4 border-t-[#c9a96e] p-5">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">{t}</p>
            <p className="text-3xl font-semibold mt-3 tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="a-card overflow-hidden lg:col-span-2">
          <h2 className="px-5 py-4 font-semibold">Revenue by day</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="a-table">
              <thead><tr><th>Date</th><th>Orders</th><th>Revenue (BHD)</th><th className="w-1/3"></th></tr></thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day}>
                    <td className="tabular-nums">{d.day}</td><td>{d.orders}</td><td className="tabular-nums">{bhd(d.revenue)}</td>
                    <td><div className="h-2 rounded-full bg-gradient-to-r from-[#a8864a] to-[#e3c88d]" style={{ width: `${(Number(d.revenue) / max) * 100}%`, minWidth: Number(d.revenue) ? 4 : 0 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="space-y-6">
          <section className="a-card p-5">
            <h2 className="font-semibold mb-3">Orders by payment status</h2>
            {byStatus.length === 0 ? <p className="text-sm text-neutral-500">No orders in this range.</p> : (
              <ul className="space-y-2 text-sm">{byStatus.map((s) => (
                <li key={s.payment_status} className="flex items-center justify-between"><Badge value={s.payment_status} /><span className="tabular-nums">{s.n}</span></li>))}</ul>
            )}
          </section>
          <section className="a-card p-5">
            <h2 className="font-semibold mb-3">Top products</h2>
            {top.length === 0 ? <p className="text-sm text-neutral-500">No paid orders in this range.</p> : (
              <ol className="space-y-2 text-sm">{top.map((t, i) => (
                <li key={t.name_ar} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#faf6ee] text-[#a8864a] grid place-items-center text-xs font-bold">{i + 1}</span>
                  <span dir="auto" className="flex-1 truncate">{t.name_ar}</span>
                  <span className="tabular-nums text-neutral-500">{t.qty} · {bhd(t.revenue)}</span>
                </li>))}</ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
