import Link from "next/link";
import { sql } from "@/lib/db";
import ProductCard, { type CardProduct } from "@/components/ProductCard";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

const WORDS = ["عبايات", "عطور", "مجوهرات", "حقائب", "ساعات", "ثياب", "عود وبخور", "هدايا فاخرة"];

export default async function Home() {
  const cats = await sql<{ slug: string; name_ar: string; image: string | null }[]>`
    select c.slug, c.name_ar,
      (select coalesce(i.thumb_path, i.path) from product_categories pc
         join products p on p.id = pc.product_id and p.status = 'published'
         join product_images i on i.product_id = p.id
        where pc.category_id = c.id order by i.sort_order, i.id limit 1) as image
    from categories c where c.is_active order by c.sort_order limit 8`;
  const products = await sql<CardProduct[]>`
    select p.slug, p.name_ar, p.price_minor, p.sale_price_minor,
      (select coalesce(i.thumb_path, i.path) from product_images i where i.product_id = p.id order by i.sort_order, i.id limit 1) as image
    from products p where p.status = 'published' order by p.created_at desc limit 8`;
  const hero = products[0]?.image ?? null;

  return (
    <main>
      <section className="hero-bg grain relative overflow-hidden text-pearl">
        <div className="absolute -top-20 -start-20 w-72 h-72 rounded-full border border-gold/20 spin-slow" />
        <div className="absolute top-1/3 -end-24 w-96 h-96 rounded-full border border-dashed border-gold/15 spin-slow-rev" />
        {[["12%","22%","0s"],["30%","70%","1s"],["72%","18%","2s"],["85%","60%","1.5s"],["55%","85%","2.5s"]].map(([l,t,d],i) => (
          <span key={i} className="twinkle absolute w-1.5 h-1.5 rounded-full bg-gold" style={{ left: l, top: t, animationDelay: d }} />
        ))}
        <div className="relative max-w-7xl mx-auto px-5 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="hero-in text-center md:text-start">
            <p className="text-gold text-sm tracking-[.3em]">وجهة الأناقة الخليجية</p>
            <h1 className="mt-4 font-display font-bold gold-text text-7xl md:text-9xl leading-[1.15]">لؤلؤة</h1>
            <p className="mt-4 text-2xl md:text-3xl font-light">الفخامة التي تليق بك</p>
            <div className="mt-9 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/shop" className="btn-gold">تسوّقي الآن</Link>
              <Link href="/about" className="btn-ghost">قصتنا</Link>
            </div>
          </div>
          <div className="relative mx-auto w-64 h-64 md:w-[26rem] md:h-[26rem]">
            <div className="pearl-orb drift absolute inset-0 rounded-full" />
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt="" className="drift absolute -bottom-6 -start-6 w-28 h-36 md:w-44 md:h-56 object-cover rounded-2xl border border-gold/50 shadow-2xl" style={{ animationDelay: "-3s" }} />
            )}
          </div>
        </div>
      </section>

      <div className="marquee bg-gold text-ink overflow-hidden py-3.5" aria-hidden="true">
        <div className="marquee-track font-display text-xl font-bold">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0">
              {WORDS.map((w) => <span key={w + k} className="px-8 flex items-center gap-8">{w}<span>✦</span></span>)}
            </div>
          ))}
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 mt-20">
        <Reveal>
          <p className="text-goldDeep text-sm tracking-[.25em]">المجموعات</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-2">تسوّقي حسب الفئة</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {cats.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 4) * 90} scale>
              <Link href={`/category/${c.slug}`} className="group card-img block aspect-[4/5] rounded-2xl">
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                <span className="absolute bottom-4 inset-x-4 text-pearl font-display text-xl md:text-2xl font-bold">{c.name_ar}</span>
                <span className="absolute top-3 end-3 w-9 h-9 grid place-items-center rounded-full bg-gold text-ink opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">←</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-24">
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <p className="text-goldDeep text-sm tracking-[.25em]">وصل حديثاً</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-2">أحدث الإصدارات</h2>
          </div>
          <Link href="/shop" className="u-link text-sm font-bold shrink-0">عرض الكل ←</Link>
        </Reveal>
        {products.length === 0 ? (
          <p className="mt-8 opacity-60">لا توجد منتجات حالياً.</p>
        ) : (
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {products.map((p, i) => <Reveal key={p.slug} delay={(i % 4) * 90}><ProductCard p={p} /></Reveal>)}
          </div>
        )}
      </section>

      <section className="mt-28 bg-ink text-pearl grain relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-5 py-24 text-center">
          <Reveal>
            <span className="text-gold text-3xl">✦</span>
            <h2 className="font-display text-4xl md:text-6xl font-bold mt-4 gold-text">أناقةٌ تُحكى كاللؤلؤ</h2>
            <p className="mt-6 text-lg leading-9 opacity-80">
              لؤلؤة وجهة مستوحاة من الذوق الخليجي الأصيل، نختار فيها قطعاً تجمع بين الرقيّ والبساطة لتناسب إطلالتك في كل مناسبة.
            </p>
            <Link href="/about" className="btn-ghost mt-8">اكتشفي المزيد</Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
