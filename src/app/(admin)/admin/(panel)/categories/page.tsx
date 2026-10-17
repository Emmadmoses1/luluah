import { sql } from "@/lib/db";
import { createCategory, updateCategory } from "@/app/(admin)/admin/catalog-actions";

export default async function Categories({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const q = await searchParams;
  const cats = await sql<{ id: string; slug: string; name_ar: string; sort_order: number; is_active: boolean; n: string }[]>`
    select c.id, c.slug, c.name_ar, c.sort_order, c.is_active, count(pc.product_id) as n
    from categories c left join product_categories pc on pc.category_id = c.id
    group by c.id order by c.sort_order, c.name_ar`;
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Catalog</p>
        <h1 className="text-3xl font-semibold mt-1">Categories</h1>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">
        {q.error === "duplicate" ? "That slug already exists." : "Check the fields: slug must be lowercase English letters, numbers and hyphens."}</p>}

      <form action={createCategory} className="a-card p-5 mb-6 grid gap-4 md:grid-cols-4 items-end">
        <label className="a-label">Arabic name<input name="name_ar" dir="rtl" required className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" /></label>
        <label className="a-label">Slug (URL)<input name="slug" required placeholder="new-collection" className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" /></label>
        <label className="a-label">Order<input name="sort_order" inputMode="numeric" defaultValue="100" className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" /></label>
        <button className="a-btn">Add category</button>
      </form>

      <div className="space-y-3">
        {cats.map((c) => (
          <form key={c.id} action={updateCategory} className="a-card p-4 flex flex-wrap items-center gap-3 hover:shadow-md transition-shadow">
            <input type="hidden" name="id" value={c.id} />
            <input name="name_ar" dir="rtl" defaultValue={c.name_ar} required className="a-input flex-1 min-w-[10rem]" />
            <span className="text-xs text-neutral-500 font-mono">{c.slug} · {c.n} products</span>
            <input name="sort_order" inputMode="numeric" defaultValue={c.sort_order} className="a-input !w-20" aria-label="Sort order" />
            <label className="text-sm flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={c.is_active} className="w-4 h-4 accent-[#a8864a]" /> Active</label>
            <button className="a-btn-ghost">Save</button>
          </form>
        ))}
      </div>
    </>
  );
}
