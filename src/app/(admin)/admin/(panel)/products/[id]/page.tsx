import { notFound } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { updateProduct } from "../../../actions";

type P = { id: string; name_ar: string; description_ar: string; sku: string; price_minor: string;
  sale_price_minor: string | null; status: string; is_featured: boolean; is_demo: boolean };

export default async function EditProduct({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [p] = await sql<P[]>`select id, name_ar, description_ar, sku, price_minor, sale_price_minor,
    status, is_featured, is_demo from products where id = ${id}`;
  if (!p) notFound();
  const vs = await sql<{ id: string; sku: string; size: string | null; color_ar: string | null; stock: number }[]>`
    select id, sku, size, color_ar, stock from product_variants where product_id = ${id} order by sku`;
  const bhd = (m: string | null) => (m === null ? "" : (Number(m) / 1000).toFixed(3));
  const input = "mt-1 w-full border rounded px-3 py-2 bg-white";

  return (
    <form action={updateProduct} className="max-w-2xl space-y-4">
      <input type="hidden" name="id" value={p.id} />
      <a href={"/admin/products/" + p.id + "/organize"} className="text-sm underline">Categories &amp; variants →</a>
      <h1 className="text-2xl font-semibold">Edit product <span className="text-base text-neutral-500">({p.sku})</span></h1>
      {q.saved && <p className="bg-green-100 text-green-900 p-2 rounded text-sm">Saved.</p>}
      {q.error && <p className="bg-red-100 text-red-900 p-2 rounded text-sm">
        {q.error === "price" ? "Invalid price. Use up to 3 decimals; the sale price must be lower than the price."
          : q.error === "stock" ? "Stock must be a whole number from 0 to 100000." : "Please check the fields."}</p>}
      <label className="block text-sm">Name (Arabic)
        <input name="name_ar" dir="rtl" defaultValue={p.name_ar} required className={input} /></label>
      <label className="block text-sm">Description (Arabic)
        <textarea name="description_ar" dir="rtl" rows={5} defaultValue={p.description_ar} className={input} /></label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">Price (BHD)
          <input name="price" inputMode="decimal" defaultValue={bhd(p.price_minor)} required className={input} /></label>
        <label className="block text-sm">Sale price (BHD, optional)
          <input name="sale_price" inputMode="decimal" defaultValue={bhd(p.sale_price_minor)} className={input} /></label>
      </div>
      <label className="block text-sm">Status
        <select name="status" defaultValue={p.status} className={input}>
          <option value="draft">Draft (hidden)</option>
          <option value="published">Published</option>
          <option value="archived">Archived (hidden)</option>
        </select></label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_featured" defaultChecked={p.is_featured} /> Featured product</label>
      <fieldset className="border rounded p-3">
        <legend className="text-sm px-1">Stock by variant</legend>
        {vs.map((v) => (
          <label key={v.id} className="flex items-center justify-between gap-3 text-sm py-1">
            <span dir="auto">{[v.size, v.color_ar].filter(Boolean).join(" · ")} <span className="text-neutral-400">{v.sku}</span></span>
            <input name={`stock_${v.id}`} inputMode="numeric" defaultValue={v.stock} className="w-24 border rounded px-2 py-1 bg-white" />
          </label>
        ))}
      </fieldset>
      <button className="bg-neutral-900 text-white px-6 py-2 rounded">Save changes</button>
    </form>
  );
}
