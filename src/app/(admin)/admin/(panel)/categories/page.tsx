import { sql } from "@/lib/db";
import { createCategory, updateCategory } from "@/app/(admin)/admin/catalog-actions";

export default async function Categories({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const q = await searchParams;
  const cats = await sql<{ id: string; slug: string; name_ar: string; sort_order: number; is_active: boolean; n: string }[]>`
    select c.id, c.slug, c.name_ar, c.sort_order, c.is_active, count(pc.product_id) as n
    from categories c left join product_categories pc on pc.category_id = c.id
    group by c.id order by c.sort_order, c.name_ar`;
  const input = "border rounded px-2 py-1 bg-white";
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Categories</h1>
      {q.saved && <p className="bg-green-100 text-green-900 p-2 rounded text-sm mb-3">Saved.</p>}
      {q.error && <p className="bg-red-100 text-red-900 p-2 rounded text-sm mb-3">
        {q.error === "duplicate" ? "That slug already exists." : "Check the fields: slug must be lowercase English letters, numbers and hyphens."}</p>}

      <form action={createCategory} className="bg-white rounded shadow p-4 mb-6 grid gap-3 md:grid-cols-4 items-end">
        <label className="text-sm">Arabic name<input name="name_ar" dir="rtl" required className={`${input} w-full mt-1`} /></label>
        <label className="text-sm">Slug (URL)<input name="slug" required placeholder="new-collection" className={`${input} w-full mt-1`} /></label>
        <label className="text-sm">Order<input name="sort_order" inputMode="numeric" defaultValue="100" className={`${input} w-full mt-1`} /></label>
        <button className="bg-neutral-900 text-white px-4 py-2 rounded">Add category</button>
      </form>

      <div className="space-y-2">
        {cats.map((c) => (
          <form key={c.id} action={updateCategory} className="bg-white rounded shadow p-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={c.id} />
            <input name="name_ar" dir="rtl" defaultValue={c.name_ar} required className={`${input} flex-1 min-w-[10rem]`} />
            <span className="text-xs text-neutral-500">{c.slug} · {c.n} products</span>
            <input name="sort_order" inputMode="numeric" defaultValue={c.sort_order} className={`${input} w-20`} />
            <label className="text-sm flex items-center gap-1"><input type="checkbox" name="is_active" defaultChecked={c.is_active} /> Active</label>
            <button className="border px-3 py-1 rounded text-sm">Save</button>
          </form>
        ))}
      </div>
    </>
  );
}
