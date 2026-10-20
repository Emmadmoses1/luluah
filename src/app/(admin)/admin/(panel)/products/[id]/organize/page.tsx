import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { addVariant, setProductCategories } from "@/app/(admin)/admin/catalog-actions";
import Field from "@/components/admin/Field";
import { TRANSLATE_ERRORS } from "@/components/admin/TranslationNotice";

export default async function Organize({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [p] = await sql<{ name_ar: string; name_en: string | null; sku: string }[]>`select name_ar, name_en, sku from products where id = ${id}`;
  if (!p) notFound();
  const cats = await sql<{ id: string; name_ar: string; name_en: string | null; has: boolean }[]>`
    select c.id, c.name_ar, c.name_en, (pc.product_id is not null) as has
    from categories c left join product_categories pc on pc.category_id = c.id and pc.product_id = ${id}
    order by c.sort_order, c.name_ar`;
  const vs = await sql<{ sku: string; size: string | null; color: string | null; stock: number }[]>`
    select sku, size, coalesce(color_en, color_ar) as color, stock from product_variants where product_id = ${id} order by sku`;
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={"/admin/products/" + id} className="text-sm text-[#a8864a] hover:underline">← Back to product</Link>
        <h1 className="text-3xl font-semibold mt-2">Categories &amp; variants</h1>
        <p className="text-sm text-neutral-500" dir="auto">{p.name_en ?? p.name_ar} ({p.sku})</p>
      </div>
      {q.saved && <p role="status" className="rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">
        {TRANSLATE_ERRORS[q.error] ?? "Enter a size or color, and stock as a whole number."}</p>}

      <form action={setProductCategories} className="a-card p-5 space-y-3">
        <input type="hidden" name="id" value={id} />
        <h2 className="font-semibold">Categories</h2>
        <div className="grid sm:grid-cols-2 gap-1">
          {cats.map((c) => (
            <label key={c.id} className="text-sm flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#faf6ee]" dir="auto">
              <input type="checkbox" name="cat" value={c.id} defaultChecked={c.has} className="w-4 h-4 accent-[#a8864a]" /> {c.name_en ?? c.name_ar}
            </label>
          ))}
        </div>
        <button className="a-btn">Save categories</button>
      </form>

      <div className="a-card p-5 space-y-3">
        <h2 className="font-semibold">Variants</h2>
        <ul className="text-sm divide-y divide-neutral-100">
          {vs.map((v) => (
            <li key={v.sku} className="py-2 flex justify-between" dir="auto">
              <span>{[v.size, v.color].filter(Boolean).join(" · ") || "Standard"} <span className="text-neutral-400 font-mono text-xs">{v.sku}</span></span>
              <span>stock {v.stock}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-neutral-500">Edit stock levels on the product page.</p>
        <form action={addVariant} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
          <input type="hidden" name="id" value={id} />
          <Field label="Size"><input name="size" className="a-input" /></Field>
          <Field label="Color (English)"><input name="color_en" className="a-input" /></Field>
          <Field label="Color in Arabic (optional)"><input name="color_ar" dir="rtl" className="a-input" /></Field>
          <Field label="Stock"><input name="stock" inputMode="numeric" className="a-input" /></Field>
          <button className="a-btn">Add variant</button>
        </form>
      </div>
    </div>
  );
}
