import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { formatBHD } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p] = await sql<{ id: string; name_ar: string; description_ar: string; sku: string;
    price_minor: string; sale_price_minor: string | null }[]>`
    select id, name_ar, description_ar, sku, price_minor, sale_price_minor
    from products where slug = ${slug} and status = 'published'`;
  if (!p) notFound();
  const variants = await sql<{ size: string | null; color_ar: string | null; stock: number }[]>`
    select size, color_ar, stock from product_variants where product_id = ${p.id} order by sku`;
  const inStock = variants.some((v) => v.stock > 0);

  return (
    <main className="max-w-6xl mx-auto px-4 mt-10 grid md:grid-cols-2 gap-10">
      <div className="aspect-[3/4] bg-gradient-to-br from-pearl to-beige flex items-center justify-center text-8xl text-gold/60 font-bold">ل</div>
      <div>
        <h1 className="text-3xl font-bold">{p.name_ar}</h1>
        <p className="mt-3 text-xl">
          {p.sale_price_minor ? (
            <>
              <span className="font-bold">{formatBHD(p.sale_price_minor)}</span>{" "}
              <span className="line-through opacity-50 text-base">{formatBHD(p.price_minor)}</span>
            </>
          ) : (
            <span className="font-bold">{formatBHD(p.price_minor)}</span>
          )}
        </p>
        <p className={`mt-2 text-sm ${inStock ? "text-green-700" : "text-red-700"}`}>
          {inStock ? "متوفر" : "نفد المخزون"}
        </p>
        <p className="mt-6 leading-8">{p.description_ar}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {variants.map((v, i) => (
            <span key={i} className={`border px-3 py-1 text-sm ${v.stock > 0 ? "border-ink" : "border-beige opacity-40 line-through"}`}>
              {[v.size, v.color_ar].filter(Boolean).join(" · ")}
            </span>
          ))}
        </div>
        <p className="mt-6 text-xs opacity-60">رمز المنتج: {p.sku}</p>
      </div>
    </main>
  );
}
