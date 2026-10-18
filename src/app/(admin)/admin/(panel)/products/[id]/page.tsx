import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { updateProduct } from "../../../actions";
import Field from "@/components/admin/Field";

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

  return (
    <form action={updateProduct} className="max-w-3xl space-y-6">
      <input type="hidden" name="id" value={p.id} />
      <div>
        <Link href="/admin/products" className="text-sm text-[#a8864a] hover:underline">← All products</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Edit product <span className="text-base text-neutral-400 font-mono">{p.sku}</span>
            {p.is_demo && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded align-middle">DEMO</span>}</h1>
          <Link href={`/admin/products/${p.id}/organize`} className="a-btn-ghost">Categories &amp; variants →</Link>
        </div>
      </div>
      {q.saved && <p role="status" className="rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">
        {q.error === "price" ? "Invalid price. Use up to 3 decimals; the sale price must be lower than the price."
          : q.error === "stock" ? "Stock must be a whole number from 0 to 100000." : "Please check the fields."}</p>}

      <section className="a-card p-6 space-y-4">
        <h2 className="font-semibold">Storefront content (Arabic)</h2>
        <Field label="Name"><input name="name_ar" dir="rtl" defaultValue={p.name_ar} required className="a-input" /></Field>
        <Field label="Description"><textarea name="description_ar" dir="rtl" rows={5} defaultValue={p.description_ar} className="a-input" /></Field>
      </section>

      <section className="a-card p-6 space-y-4">
        <h2 className="font-semibold">Pricing &amp; visibility</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Price (BHD)"><input name="price" inputMode="decimal" defaultValue={bhd(p.price_minor)} required className="a-input" /></Field>
          <Field label="Sale price (BHD, optional)"><input name="sale_price" inputMode="decimal" defaultValue={bhd(p.sale_price_minor)} className="a-input" /></Field>
        </div>
        <Field label="Status">
          <select name="status" defaultValue={p.status} className="a-input">
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={p.is_featured} className="w-4 h-4 accent-[#a8864a]" /> Featured product</label>
      </section>

      <section className="a-card p-6">
        <h2 className="font-semibold mb-3">Stock by variant</h2>
        {vs.length === 0 && <p className="text-sm text-neutral-500">No variants yet. Add them under Categories &amp; variants.</p>}
        <div className="divide-y divide-neutral-100">
          {vs.map((v) => (
            <label key={v.id} className="flex items-center justify-between gap-3 text-sm py-2.5">
              <span dir="auto">{[v.size, v.color_ar].filter(Boolean).join(" · ") || "Standard"} <span className="text-neutral-400 font-mono text-xs">{v.sku}</span></span>
              <input name={`stock_${v.id}`} inputMode="numeric" defaultValue={v.stock} className="a-input !w-28" />
            </label>
          ))}
        </div>
      </section>
      <button className="a-btn">Save changes</button>
    </form>
  );
}
