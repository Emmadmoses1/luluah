import { sql } from "@/lib/db";

export default async function Dashboard() {
  const [c] = await sql<{ published: string; draft: string; demo: string }[]>`
    select count(*) filter (where status = 'published') as published,
           count(*) filter (where status = 'draft') as draft,
           count(*) filter (where is_demo) as demo from products`;
  const [l] = await sql<{ n: string }[]>`
    select count(*) as n from product_variants v join products p on p.id = v.product_id
    where p.status = 'published' and v.stock <= 3`;
  const cards: [string, string, string][] = [
    ["Published products", c.published, "#c9a96e"], ["Draft products", c.draft, "#737373"],
    ["Demo products", c.demo, "#a8864a"], ["Low-stock variants (3 or fewer)", l.n, "#b91c1c"],
  ];
  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Overview</p>
        <h1 className="text-3xl font-semibold mt-1">Dashboard</h1>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(([t, n, color], i) => (
          <div key={t} style={{ animationDelay: `${i * 90}ms`, borderTopColor: color }}
            className="admin-card bg-white rounded-2xl border border-neutral-200/70 border-t-4 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs uppercase tracking-wider text-neutral-500">{t}</p>
            <p className="text-4xl font-semibold mt-3 tabular-nums">{n}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-neutral-500">Revenue and order analytics will appear here as real orders arrive.</p>
      <style>{`.admin-card{opacity:0;animation:fade-up .7s cubic-bezier(.22,.8,.24,1) forwards}`}</style>
    </>
  );
}
