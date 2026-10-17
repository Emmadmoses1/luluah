import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { formatBHD } from "@/lib/money";
import AddToCart, { type VariantOpt } from "@/components/AddToCart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p] = await sql<{ id: string; name_ar: string; description_ar: string; sku: string;
    price_minor: string; sale_price_minor: string | null }[]>`
    select id, name_ar, description_ar, sku, price_minor, sale_price_minor
    from products where slug = ${slug} and status = 'published'`;
  if (!p) notFound();
  const variants = await sql<VariantOpt[]>`
    select id, size, color_ar, stock from product_variants where product_id = ${p.id} order by sku`;
  const images = await sql<{ path: string; alt_ar: string; photographer: string | null; photographer_url: string | null }[]>`
    select path, alt_ar, photographer, photographer_url from product_images
    where product_id = ${p.id} order by sort_order, id`;
  const inStock = variants.some((v) => v.stock > 0);
  const main = images[0];

  return (
    <main className="max-w-6xl mx-auto px-4 mt-10 grid md:grid-cols-2 gap-10">
      <div>
        <div className="aspect-[3/4] bg-gradient-to-br from-pearl to-beige overflow-hidden flex items-center justify-center text-8xl text-gold/60 font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {main ? <img src={main.path} alt={main.alt_ar || p.name_ar} className="w-full h-full object-cover" /> : "ل"}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.slice(1).map((im) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={im.path} src={im.path} alt={im.alt_ar || p.name_ar} loading="lazy" className="h-24 w-20 object-cover" />
            ))}
          </div>
        )}
        {main?.photographer && (
          <p className="mt-2 text-xs opacity-50">
            صورة: {main.photographer}{" "}
            <a className="underline" href="https://pixabay.com" target="_blank" rel="noopener noreferrer">Pixabay</a>
          </p>
        )}
      </div>
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
        <AddToCart variants={variants} />
        <p className="mt-6 text-xs opacity-60">رمز المنتج: {p.sku}</p>
      </div>
    </main>
  );
}
