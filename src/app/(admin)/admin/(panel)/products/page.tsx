import Link from "next/link";
import { sql } from "@/lib/db";
import Badge from "@/components/admin/Badge";

export default async function Products() {
  const rows = await sql<{ id: string; name_ar: string; sku: string; price_minor: string;
    status: string; is_demo: boolean; stock: string; image: string | null }[]>`
    select p.id, p.name_ar, p.sku, p.price_minor, p.status, p.is_demo,
           coalesce(sum(v.stock), 0) as stock,
           (select coalesce(i.thumb_path, i.path) from product_images i where i.product_id = p.id order by i.sort_order, i.id limit 1) as image
    from products p left join product_variants v on v.product_id = p.id
    group by p.id order by p.created_at desc`;
  return (
    <>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Catalog</p>
          <h1 className="text-3xl font-semibold mt-1">Products</h1>
        </div>
        <Link href="/admin/products/new" className="a-btn">+ New product</Link>
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Price (BHD)</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="text-neutral-500">No products yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-14 rounded-lg bg-[#f5f2ec] overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {r.image && <img src={r.image} alt="" className="w-full h-full object-cover" />}
                    </span>
                    <span dir="rtl">{r.name_ar}</span>
                    {r.is_demo && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">DEMO</span>}
                  </div>
                </td>
                <td className="font-mono text-xs">{r.sku}</td>
                <td className="tabular-nums">{(Number(r.price_minor) / 1000).toFixed(3)}</td>
                <td className={`tabular-nums ${Number(r.stock) <= 3 ? "text-red-700 font-semibold" : ""}`}>{r.stock}</td>
                <td><Badge value={r.status} /></td>
                <td><Link className="a-btn-ghost" href={`/admin/products/${r.id}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
