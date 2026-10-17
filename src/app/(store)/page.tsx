import { sql } from "@/lib/db";
import ProductCard, { type CardProduct } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cats = await sql<{ slug: string; name_ar: string }[]>`
    select slug, name_ar from categories where is_active order by sort_order`;
  const products = await sql<CardProduct[]>`
    select slug, name_ar, price_minor, sale_price_minor from products
    where status = 'published' order by created_at desc limit 8`;

  return (
    <main>
      <section className="bg-ink text-pearl text-center py-24 px-4">
        <h1 className="text-6xl font-bold text-gold">لؤلؤة</h1>
        <p className="mt-4 text-xl">الفخامة التي تليق بك</p>
      </section>

      <section className="max-w-6xl mx-auto px-4 mt-14">
        <h2 className="text-2xl font-bold mb-6">تسوّق حسب الفئة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cats.map((c) => (
            <div key={c.slug} className="border border-beige bg-pearl py-6 text-center text-sm font-semibold">
              {c.name_ar}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 mt-14">
        <h2 className="text-2xl font-bold mb-6">منتجات مختارة</h2>
        {products.length === 0 ? (
          <p className="opacity-60">لا توجد منتجات حالياً.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {products.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        )}
      </section>
    </main>
  );
}
