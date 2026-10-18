import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { sql } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { getDisplayCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/settings";
import AddToCart, { type VariantOpt } from "@/components/AddToCart";
import Gallery from "@/components/Gallery";
import ProductCard, { type CardProduct } from "@/components/ProductCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import ReviewForm from "@/components/ReviewForm";
import Stars from "@/components/Stars";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

type Prod = { id: string; name_ar: string; description_ar: string; sku: string; price_minor: string; sale_price_minor: string | null };
const getProduct = cache(async (slug: string) => {
  const [p] = await sql<Prod[]>`
    select id, name_ar, description_ar, sku, price_minor, sale_price_minor
    from products where slug = ${slug} and status = 'published'`;
  return p;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "المنتج غير موجود" };
  const [img] = await sql<{ path: string }[]>`select path from product_images where product_id = ${p.id} order by sort_order, id limit 1`;
  const desc = p.description_ar.replace(/\s+/g, " ").slice(0, 150);
  return {
    title: p.name_ar, description: desc, alternates: { canonical: `/product/${slug}` },
    openGraph: { title: p.name_ar, description: desc, type: "website", ...(img ? { images: [img.path] } : {}) },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const [variants, images, cats, reviews, [agg], related, cur, { store }] = await Promise.all([
    sql<VariantOpt[]>`select id, size, color_ar, stock from product_variants where product_id = ${p.id} order by sku`,
    sql<{ path: string; alt_ar: string; photographer: string | null }[]>`
      select path, alt_ar, photographer from product_images where product_id = ${p.id} order by sort_order, id`,
    sql<{ slug: string; name_ar: string }[]>`
      select c.slug, c.name_ar from product_categories pc join categories c on c.id = pc.category_id
      where pc.product_id = ${p.id} and c.is_active order by c.sort_order limit 1`,
    sql<{ author_name: string; rating: number; body: string; created_at: Date }[]>`
      select author_name, rating, body, created_at from reviews
      where product_id = ${p.id} and status = 'approved' order by created_at desc limit 10`,
    sql<{ n: string; avg: string | null }[]>`
      select count(*) as n, avg(rating) as avg from reviews where product_id = ${p.id} and status = 'approved'`,
    sql<CardProduct[]>`
      select p2.slug, p2.name_ar, p2.price_minor, p2.sale_price_minor,
        (select coalesce(i.thumb_path, i.path) from product_images i where i.product_id = p2.id order by i.sort_order, i.id limit 1) as image
      from products p2
      where p2.status = 'published' and p2.id <> ${p.id}
        and exists (select 1 from product_categories a join product_categories b on b.category_id = a.category_id
                    where a.product_id = ${p.id} and b.product_id = p2.id)
      order by p2.created_at desc limit 4`,
    getDisplayCurrency(),
    getSettings(),
  ]);

  const inStock = variants.some((v) => v.stock > 0);
  const approx = cur.code !== "BHD" ? "≈ " : "";
  const reviewCount = Number(agg.n);
  const sizes = [...new Set(variants.map((v) => v.size).filter((x): x is string => !!x && x !== "—"))];
  const colors = [...new Set(variants.map((v) => v.color_ar).filter((x): x is string => !!x && x !== "—"))];
  const base = process.env.SITE_URL ?? "";
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: p.name_ar, description: p.description_ar, sku: p.sku,
    ...(base && images.length ? { image: images.map((i) => `${base}${i.path}`) } : {}),
    offers: { "@type": "Offer", priceCurrency: "BHD", price: (Number(p.sale_price_minor ?? p.price_minor) / 1000).toFixed(3),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", ...(base ? { url: `${base}/product/${slug}` } : {}) },
    ...(reviewCount > 0 && agg.avg ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(agg.avg).toFixed(1), reviewCount } } : {}),
  };
  const row = "group rounded-2xl border border-beige bg-white px-5 py-4";
  const sum = "cursor-pointer list-none flex items-center justify-between font-bold text-sm";
  const plus = <span className="text-gold text-xl transition-transform group-open:rotate-45">+</span>;

  return (
    <main className="max-w-7xl mx-auto px-4 mt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <nav aria-label="مسار التنقل" className="text-xs opacity-70 flex flex-wrap items-center gap-2">
        <Link href="/" className="hover:text-goldDeep">الرئيسية</Link><span aria-hidden>‹</span>
        {cats[0] && <><Link href={`/category/${cats[0].slug}`} className="hover:text-goldDeep">{cats[0].name_ar}</Link><span aria-hidden>‹</span></>}
        <span className="font-semibold">{p.name_ar}</span>
      </nav>

      <div className="mt-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <div className="lg:sticky lg:top-28">
          <Gallery images={images.map((i) => ({ path: i.path, alt: i.alt_ar }))} name={p.name_ar} />
          {images[0]?.photographer && (
            <p className="mt-3 text-xs opacity-50">
              صورة: {images[0].photographer}{" "}
              <a className="underline" href="https://pixabay.com" target="_blank" rel="noopener noreferrer">Pixabay</a>
            </p>
          )}
        </div>

        <div>
          {cats[0] && <p className="text-goldDeep text-sm tracking-[.2em]">{cats[0].name_ar}</p>}
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-bold leading-[1.35]">{p.name_ar}</h1>
          {reviewCount > 0 && agg.avg && (
            <p className="mt-3 flex items-center gap-2 text-sm"><Stars value={Number(agg.avg)} /><span className="opacity-60">({reviewCount.toLocaleString("ar")})</span></p>
          )}
          <p className="mt-5 text-3xl">
            {p.sale_price_minor ? (
              <>
                <span className="font-bold text-goldDeep">{approx}{formatMoney(p.sale_price_minor, cur)}</span>{" "}
                <span className="line-through opacity-45 text-lg">{formatMoney(p.price_minor, cur)}</span>
              </>
            ) : <span className="font-bold">{approx}{formatMoney(p.price_minor, cur)}</span>}
          </p>
          {cur.code !== "BHD" && <p className="mt-1 text-xs opacity-60">السعر المعروض تقريبي حسب سعر الصرف، ويتم الدفع بالدينار البحريني.</p>}
          <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${inStock ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
            {inStock ? "متوفر" : "نفد المخزون"}
          </p>
          <p className="mt-6 leading-9 opacity-85 whitespace-pre-line">{p.description_ar}</p>
          <AddToCart variants={variants} />

          <div className="mt-10 space-y-3">
            <details className={row}><summary className={sum}>التوصيل{plus}</summary>
              <p className="mt-3 text-sm leading-8 opacity-80">تظهر خيارات التوصيل ورسوم الشحن ومدة التوصيل المتوقعة عند إتمام الطلب حسب بلد التوصيل. التوصيل متاح فقط إلى الدول المفعّلة في المتجر.</p>
            </details>
            <details className={row}><summary className={sum}>الإرجاع{plus}</summary>
              <p className="mt-3 text-sm leading-8 opacity-80">يمكن طلب إرجاع المنتجات المؤهلة خلال {store.return_days.toLocaleString("ar")} يوماً من الاستلام. <Link href="/returns" className="underline">اقرأ سياسة الإرجاع</Link></p>
            </details>
            <details className={row}><summary className={sum}>تفاصيل المنتج{plus}</summary>
              <dl className="mt-3 text-sm leading-8 grid grid-cols-[auto_1fr] gap-x-6">
                <dt className="opacity-60">رمز المنتج</dt><dd dir="ltr" className="text-end font-mono">{p.sku}</dd>
                {sizes.length > 0 && <><dt className="opacity-60">المقاسات</dt><dd>{sizes.join("، ")}</dd></>}
                {colors.length > 0 && <><dt className="opacity-60">الألوان</dt><dd>{colors.join("، ")}</dd></>}
              </dl>
            </details>
          </div>
        </div>
      </div>

      <section className="mt-20 max-w-3xl">
        <Reveal>
          <h2 className="font-display text-3xl font-bold">آراء العملاء</h2>
          {reviews.length === 0 ? (
            <p className="mt-4 text-sm opacity-60">لا توجد تقييمات بعد.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {reviews.map((r, i) => (
                <li key={i} className="rounded-2xl border border-beige bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-sm">{r.author_name}</span><Stars value={r.rating} />
                  </div>
                  {r.body && <p className="mt-2 text-sm leading-8 opacity-80">{r.body}</p>}
                </li>
              ))}
            </ul>
          )}
          <ReviewForm slug={slug} />
        </Reveal>
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <Reveal><h2 className="font-display text-3xl font-bold">قد يعجبك أيضاً</h2></Reveal>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {related.map((r, i) => <Reveal key={r.slug} delay={i * 80}><ProductCard p={r} cur={cur} /></Reveal>)}
          </div>
        </section>
      )}
      <RecentlyViewed currentSlug={slug} />
    </main>
  );
}
