import { sql } from "@/lib/db";
import { createProduct } from "@/app/(admin)/admin/catalog-actions";

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
  const input = "mt-1 w-full border rounded px-3 py-2 bg-white";
  return (
    <form action={createProduct} className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">New product</h1>
      {q.error && <p className="bg-red-100 text-red-900 p-2 rounded text-sm">{MSG[q.error] ?? "Something went wrong."}</p>}
      <label className="block text-sm">Name (Arabic)<input name="name_ar" dir="rtl" required className={input} /></label>
      <label className="block text-sm">Description (Arabic)<textarea name="description_ar" dir="rtl" rows={4} className={input} /></label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">Slug (URL, English)<input name="slug" required placeholder="black-abaya" className={input} /></label>
        <label className="block text-sm">SKU<input name="sku" required placeholder="ABY-100" className={input} /></label>
        <label className="block text-sm">Price (BHD)<input name="price" inputMode="decimal" required placeholder="25.000" className={input} /></label>
        <label className="block text-sm">Sale price (optional)<input name="sale_price" inputMode="decimal" className={input} /></label>
      </div>
      <label className="block text-sm">Status
        <select name="status" defaultValue="draft" className={input}>
          <option value="draft">Draft (hidden)</option><option value="published">Published</option>
        </select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" /> Featured product</label>
      <fieldset className="border rounded p-3 space-y-2">
        <legend className="text-sm px-1">Variants (blank rows are ignored)</legend>
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <input name={`size_${i}`} dir="rtl" placeholder="Size" className="border rounded px-2 py-1 bg-white" />
            <input name={`color_${i}`} dir="rtl" placeholder="Color (Arabic)" className="border rounded px-2 py-1 bg-white" />
            <input name={`stock_${i}`} inputMode="numeric" placeholder="Stock" className="border rounded px-2 py-1 bg-white" />
          </div>
        ))}
      </fieldset>
      <fieldset className="border rounded p-3">
        <legend className="text-sm px-1">Categories</legend>
        <div className="grid grid-cols-2 gap-1">
          {cats.map((c) => (
            <label key={c.id} className="text-sm flex items-center gap-2" dir="rtl">
              <input type="checkbox" name="cat" value={c.id} /> {c.name_ar}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="bg-neutral-900 text-white px-6 py-2 rounded">Create product</button>
    </form>
  );
}
