import { sql } from "@/lib/db";

export default async function Dashboard() {
  const [c] = await sql<{ published: string; draft: string; demo: string }[]>`
    select count(*) filter (where status = 'published') as published,
           count(*) filter (where status = 'draft') as draft,
           count(*) filter (where is_demo) as demo from products`;
  const [l] = await sql<{ n: string }[]>`
    select count(*) as n from product_variants v join products p on p.id = v.product_id
    where p.status = 'published' and v.stock <= 3`;
  const cards = [
    ["Published products", c.published], ["Draft products", c.draft],
    ["Demo products", c.demo], ["Low-stock variants (3 or fewer)", l.n],
  ];
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([t, n]) => (
          <div key={t} className="bg-white rounded shadow p-4">
            <p className="text-sm text-neutral-500">{t}</p>
            <p className="text-3xl font-semibold mt-1">{n}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-neutral-500">Orders and revenue appear here once checkout is built.</p>
    </>
  );
}
