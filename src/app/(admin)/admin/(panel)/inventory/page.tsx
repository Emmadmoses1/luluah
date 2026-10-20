import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { likeEscape } from "@/lib/arabic";
import { adjustStock } from "@/app/(admin)/admin/manage-actions";

const LOW = 3;
const MSG: Record<string, string> = {
  delta: "Enter a whole number such as +10 or -2.", range: "That change would make stock negative or too large.",
};

export default async function Inventory({ searchParams }: { searchParams: Promise<{ q?: string; low?: string; saved?: string; error?: string; v?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const p = await searchParams;
  const q = (p.q ?? "").trim().slice(0, 60);
  const low = p.low === "1";
  const like = `%${likeEscape(q)}%`;
  const [s] = await sql<{ out: string; low: string; total: string }[]>`
    select count(*) filter (where v.stock = 0) as out,
           count(*) filter (where v.stock between 1 and ${LOW}) as low, count(*) as total
    from product_variants v join products pr on pr.id = v.product_id where pr.status <> 'archived'`;
  const rows = await sql<{ id: string; sku: string; size: string | null; color_ar: string | null; stock: number;
    name_ar: string; pid: string; status: string }[]>`
    select v.id, v.sku, v.size, coalesce(v.color_en, v.color_ar) as color_ar, v.stock, coalesce(pr.name_en, pr.name_ar) as name_ar, pr.id as pid, pr.status
    from product_variants v join products pr on pr.id = v.product_id
    where pr.status <> 'archived' and (${q} = '' or v.sku ilike ${like} or pr.name_ar ilike ${like} or pr.name_en ilike ${like})
      and (${low} = false or v.stock <= ${LOW})
    order by v.stock, pr.name_ar limit 200`;
  const tab = (on: boolean) => `rounded-full px-4 py-1.5 text-sm font-medium ${on ? "bg-[#0c0a09] text-[#c9a96e]" : "bg-white border border-neutral-200 hover:border-[#c9a96e]"}`;

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Catalog</p>
        <h1 className="text-3xl font-semibold mt-1">Inventory</h1>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {([["Variants", s.total, "#0c0a09"], [`Low (1-${LOW})`, s.low, "#d97706"], ["Out of stock", s.out, "#b91c1c"]] as [string, string, string][]).map(([t, n, c]) => (
          <div key={t} className="a-card border-t-4 p-4" style={{ borderTopColor: c }}>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">{t}</p><p className="text-3xl font-semibold mt-2 tabular-nums">{n}</p>
          </div>
        ))}
      </div>
      {p.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Stock updated.</p>}
      {p.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{MSG[p.error] ?? "Could not update stock."}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/admin/inventory" className={tab(!low)}>All</Link>
        <Link href="/admin/inventory?low=1" className={tab(low)}>Low &amp; out of stock</Link>
        <form className="flex gap-2 ml-auto">
          {low && <input type="hidden" name="low" value="1" />}
          <input name="q" defaultValue={q} placeholder="Search SKU or name" className="a-input !w-56" />
          <button className="a-btn-ghost">Search</button>
        </form>
      </div>

      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th><th>Adjust</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="text-neutral-500">Nothing matches.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className={p.v === r.id ? "!bg-emerald-50" : ""}>
                <td dir="auto"><Link className="hover:underline" href={`/admin/products/${r.pid}`}>{r.name_ar}</Link>
                  {r.status !== "published" && <span className="mr-2 text-[10px] bg-neutral-200 px-1.5 py-0.5 rounded">{r.status}</span>}</td>
                <td dir="auto">{[r.size, r.color_ar].filter((x) => x && x !== "—").join(" · ") || "Standard"}</td>
                <td className="font-mono text-xs">{r.sku}</td>
                <td className={`tabular-nums font-semibold ${r.stock === 0 ? "text-red-700" : r.stock <= LOW ? "text-amber-700" : ""}`}>{r.stock}</td>
                <td>
                  <form action={adjustStock} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />{low && <input type="hidden" name="low" value="1" />}
                    <input name="delta" inputMode="numeric" placeholder="+10 / -2" required className="a-input !w-24" aria-label="Change" />
                    <input name="reason" placeholder="Reason (optional)" maxLength={200} className="a-input !w-44" />
                    <button className="a-btn !px-4">Apply</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">Each change is recorded in the audit log. Stock can never go below zero.</p>
    </>
  );
}
