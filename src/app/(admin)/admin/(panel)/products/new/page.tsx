import Link from "next/link";
import { sql } from "@/lib/db";
import { createProduct } from "@/app/(admin)/admin/catalog-actions";
import Field from "@/components/admin/Field";

const MSG: Record<string, string> = {
  fields: "Check the fields. Slug: lowercase English letters, numbers, hyphens. SKU: letters, numbers, hyphens.",
  price: "Invalid price. Use up to 3 decimals; the sale price must be lower than the price.",
  stock: "Stock must be a whole number from 0 to 100000.",
  variant: "Add at least one variant (a size or a color).",
  duplicate: "That slug or SKU is already used by another product.",
};

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const q = await searchParams;
  const cats = await sql<{ id: string; name_ar: string }[]>`
    select id, name_ar from categories order by sort_order, name_ar`;
  return (
    <form action={createProduct} className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-[#a8864a] hover:underline">← All products</Link>
        <h1 className="mt-2 text-3xl font-semibold">New product</h1>
      </div>
      {q.error && <p role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{MSG[q.error] ?? "Something went wrong."}</p>}

      <section className="a-card p-6 space-y-4">
        <h2 className="font-semibold">Storefront content (Arabic)</h2>
        <Field label="Name"><input name="name_ar" dir="rtl" required className="a-input" /></Field>
        <Field label="Description"><textarea name="description_ar" dir="rtl" rows={4} className="a-input" /></Field>
      </section>

      <section className="a-card p-6 space-y-4">
        <h2 className="font-semibold">Identity &amp; pricing</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Slug (URL, English)"><input name="slug" required placeholder="black-abaya" className="a-input" /></Field>
          <Field label="SKU"><input name="sku" required placeholder="ABY-100" className="a-input" /></Field>
          <Field label="Price (BHD)"><input name="price" inputMode="decimal" required placeholder="25.000" className="a-input" /></Field>
          <Field label="Sale price (optional)"><input name="sale_price" inputMode="decimal" className="a-input" /></Field>
        </div>
        <Field label="Status">
          <select name="status" defaultValue="draft" className="a-input">
            <option value="draft">Draft (hidden)</option><option value="published">Published</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" className="w-4 h-4 accent-[#a8864a]" /> Featured product</label>
      </section>

      <section className="a-card p-6 space-y-3">
        <h2 className="font-semibold">Variants <span className="text-xs font-normal text-neutral-400">(blank rows are ignored)</span></h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <input name={`size_${i}`} dir="rtl" placeholder="Size" className="a-input" />
            <input name={`color_${i}`} dir="rtl" placeholder="Color (Arabic)" className="a-input" />
            <input name={`stock_${i}`} inputMode="numeric" placeholder="Stock" className="a-input" />
          </div>
        ))}
      </section>

      <section className="a-card p-6">
        <h2 className="font-semibold mb-3">Categories</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {cats.map((c) => (
            <label key={c.id} className="text-sm flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#faf6ee]" dir="rtl">
              <input type="checkbox" name="cat" value={c.id} className="w-4 h-4 accent-[#a8864a]" /> {c.name_ar}
            </label>
          ))}
        </div>
      </section>
      <button className="a-btn">Create product</button>
    </form>
  );
}
