import Link from "next/link";
import { sql } from "@/lib/db";
import { createProduct } from "@/app/(admin)/admin/catalog-actions";
import Field from "@/components/admin/Field";
import TranslationNotice, { TRANSLATE_ERRORS } from "@/components/admin/TranslationNotice";

const MSG: Record<string, string> = {
  ...TRANSLATE_ERRORS,
  fields: "Check the fields. The English name is required. Slug: lowercase English letters, numbers, hyphens. SKU: letters, numbers, hyphens.",
  price: "Invalid price. Use up to 3 decimals; the sale price must be lower than the price.",
  stock: "Stock must be a whole number from 0 to 100000.",
  variant: "Add at least one variant (a size or a color).",
  duplicate: "That slug or SKU is already used by another product.",
};

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const q = await searchParams;
  const cats = await sql<{ id: string; name_ar: string; name_en: string | null }[]>`
    select id, name_ar, name_en from categories order by sort_order, name_ar`;
  return (
    <form action={createProduct} className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-[#a8864a] hover:underline">← All products</Link>
        <h1 className="mt-2 text-3xl font-semibold">New product</h1>
      </div>
      <TranslationNotice />
      {q.error && <p role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{MSG[q.error] ?? "Something went wrong."}</p>}

      <section className="a-card p-6 space-y-4">
        <h2 className="font-semibold">Product details (English)</h2>
        <Field label="Name"><input name="name_en" required maxLength={200} className="a-input" /></Field>
        <Field label="Description"><textarea name="description_en" rows={5} maxLength={5000} className="a-input" /></Field>
        <details className="rounded-xl border border-neutral-200 p-4">
          <summary className="cursor-pointer text-sm font-medium">Arabic text (optional: only fill in to override the automatic translation)</summary>
          <div className="mt-4 space-y-4">
            <Field label="Arabic name"><input name="name_ar" dir="rtl" maxLength={200} className="a-input" /></Field>
            <Field label="Arabic description"><textarea name="description_ar" dir="rtl" rows={4} maxLength={5000} className="a-input" /></Field>
          </div>
        </details>
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
        <div className="hidden sm:grid grid-cols-4 gap-2 text-xs uppercase tracking-wider text-neutral-500"><span>Size</span><span>Color (English)</span><span>Color in Arabic (optional)</span><span>Stock</span></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input name={`size_${i}`} placeholder="Size" className="a-input" />
            <input name={`color_en_${i}`} placeholder="Color, e.g. Black" className="a-input" />
            <input name={`color_ar_${i}`} dir="rtl" placeholder="اللون" className="a-input" />
            <input name={`stock_${i}`} inputMode="numeric" placeholder="Stock" className="a-input" />
          </div>
        ))}
      </section>

      <section className="a-card p-6">
        <h2 className="font-semibold mb-3">Categories</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {cats.map((c) => (
            <label key={c.id} className="text-sm flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#faf6ee]" dir="auto">
              <input type="checkbox" name="cat" value={c.id} className="w-4 h-4 accent-[#a8864a]" /> {c.name_en ?? c.name_ar}
            </label>
          ))}
        </div>
      </section>
      <button className="a-btn">Create product</button>
    </form>
  );
}
