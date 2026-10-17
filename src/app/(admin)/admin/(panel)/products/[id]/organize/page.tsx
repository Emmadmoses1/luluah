import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { addVariant, setProductCategories } from "@/app/(admin)/admin/catalog-actions";

export default async function Organize({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [p] = await sql<{ name_ar: string; sku: string }[]>`select name_ar, sku from products where id = ${id}`;
  if (!p) notFound();
  const cats = await sql<{ id: string; name_ar: string; has: boolean }[]>`
    select c.id, c.name_ar, (pc.product_id is not null) as has
    from categories c left join product_categories pc on pc.category_id = c.id and pc.product_id = ${id}
    order by c.sort_order, c.name_ar`;
  const vs = await sql<{ sku: string; size: string | null; color_ar: string | null; stock: number }[]>`
    select sku, size, color_ar, stock from product_variants where product_id = ${id} order by sku`;
  const input = "border rounded px-2 py-1 bg-white";
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={"/admin/products/" + id} className="text-sm underline">← Back to product</Link>
        <h1 className="text-2xl font-semibold mt-2">Categories &amp; variants</h1>
        <p className="text-sm text-neutral-500" dir="auto">{p.name_ar} ({p.sku})</p>
      </div>
      {q.saved && <p className="bg-green-100 text-green-900 p-2 rounded text-sm">Saved.</p>}
      {q.error && <p className="bg-red-100 text-red-900 p-2 rounded text-sm">Enter a size or color, and stock as a whole number.</p>}

      <form action={setProductCategories} className="bg-white rounded shadow p-4 space-y-3">
        <input type="hidden" name="id" value={id} />
        <h2 className="font-semibold">Categories</h2>
        <div className="grid grid-cols-2 gap-1">
          {cats.map((c) => (
            <label key={c.id} className="text-sm flex items-center gap-2" dir="rtl">
              <input type="checkbox" name="cat" value={c.id} defaultChecked={c.has} /> {c.name_ar}
            </label>
          ))}
        </div>
        <button className="bg-neutral-900 text-white px-4 py-2 rounded">Save categories</button>
      </form>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Variants</h2>
        <ul className="text-sm divide-y">
          {vs.map((v) => (
            <li key={v.sku} className="py-1 flex justify-between" dir="auto">
              <span>{[v.size, v.color_ar].filter(Boolean).join(" · ")} <span className="text-neutral-400">{v.sku}</span></span>
              <span>stock {v.stock}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-neutral-500">Edit stock levels on the product page.</p>
        <form action={addVariant} className="grid grid-cols-4 gap-2 items-end">
          <input type="hidden" name="id" value={id} />
          <input name="size" dir="rtl" placeholder="Size" className={input} />
          <input name="color" dir="rtl" placeholder="Color (Arabic)" className={input} />
          <input name="stock" inputMode="numeric" placeholder="Stock" className={input} />
          <button className="border px-3 py-1 rounded">Add variant</button>
        </form>
      </div>
    </div>
  );
}
