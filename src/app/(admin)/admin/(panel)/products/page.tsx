import Link from "next/link";
import { sql } from "@/lib/db";

export default async function Products() {
  const rows = await sql<{ id: string; name_ar: string; sku: string; price_minor: string;
    status: string; is_demo: boolean; stock: string }[]>`
    select p.id, p.name_ar, p.sku, p.price_minor, p.status, p.is_demo,
           coalesce(sum(v.stock), 0) as stock
    from products p left join product_variants v on v.product_id = p.id
    group by p.id order by p.created_at desc`;
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Products</h1>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr><th className="p-3">Name</th><th className="p-3">SKU</th><th className="p-3">Price (BHD)</th>
              <th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3" dir="rtl">{r.name_ar}{r.is_demo && <span className="ml-2 text-xs bg-amber-100 px-1">demo</span>}</td>
                <td className="p-3">{r.sku}</td>
                <td className="p-3">{(Number(r.price_minor) / 1000).toFixed(3)}</td>
                <td className="p-3">{r.stock}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3"><Link className="underline" href={`/admin/products/${r.id}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
