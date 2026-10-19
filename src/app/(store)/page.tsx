import Link from "next/link";
import { sql } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import ProductCard, { type CardProduct } from "@/components/ProductCard";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

const WORDS = ["عبايات", "عطور", "مجوهرات", "حقائب", "ساعات", "ثياب", "عود وبخور", "هدايا فاخرة"];
const IMG = `(select coalesce(i.thumb_path, i.path) from product_images i where i.product_id = p.id order by i.sort_order, i.id limit 1)`;

function Icon({ d }: { d: string }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

export default async function Home() {
  const [{ store }, cur] = await Promise.all([getSettings(), getDisplayCurrency()]);
  const cats = await sql<{ slug: string; name_ar: string; image: string | null }[]>`
    select c.slug, c.name_ar,
      (select coalesce(i.thumb_path, i.path) from product_categories pc
         join products p on p.id = pc.product_id and p.status = 'published'
         join product_images i on i.product_id = p.id
        where pc.category_id = c.id order by i.sort_order, i.id limit 1) as image
    from categories c where c.is_active order by c.sort_order limit 9`;
  const fresh = await sql<CardProduct[]>`
    select p.slug, p.name_ar, p.price_minor, p.sale_price_minor, ${sql.unsafe(IMG)} as image
    from products p where p.status = 'published' order by p.created_at desc limit 8`;
  const featured = await sql<CardProduct[]>`
    select p.slug, p.name_ar, p.price_minor, p.sale_price_minor, ${sql.unsafe(IMG)} as image
    from products p where p.status = 'published' and p.is_featured order by p.created_at desc limit 4`;
  const best = await sql<CardProduct[]>`
    select p.slug, p.name_ar, p.price_minor, p.sale_price_minor, ${sql.unsafe(IMG)} as image
    from products p
    join (select v.product_id, sum(oi.qty) as q from order_items oi
            join orders o on o.id = oi.order_id join product_variants v on v.id = oi.variant_id
           where o.payment_status = 'paid' and not o.is_test group by v.product_id) s on s.product_id = p.id
    where p.status = 'published' order by s.q desc limit 4`;
  const hero = featured[0]?.image ?? fresh[0]?.image ?? null;
  const days = store.return_days.toLocaleString("ar");
  const trust: [string, string, string][] = [
    ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4", "دفع آمن", "الدفع بالعملات الرقمية عبر مزوّد دفع موثوق"],
    ["M3 7h11v9H3zM14 10h4l3 3v3h-7", "تتبّع طلبك", "تابع حالة طلبك في أي وقت برقم الطلب"],
    ["M3 12a9 9 0 1 0 3-6.7M3 4v5h5", "سياسة إرجاع واضحة", `إرجاع المنتجات المؤهلة خلال ${days} يوماً`],
    ["M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z", "نحن بجانبك", "تواصل معنا لأي استفسار قبل الطلب أو بعده"],
  ];

  return (
    <main>
      {/* HERO */}
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

      {/* MARQUEE */}
      <div className="marquee bg-gold text-ink overflow-hidden py-3.5" aria-hidden="true">
        <div className="marquee-track font-display text-xl font-bold">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0">
              {WORDS.map((w) => <span key={w + k} className="px-8 flex items-center gap-8">{w}<span>✦</span></span>)}
            </div>
          ))}
        </div>
      </div>

      {/* TRUST */}
      <section className="max-w-7xl mx-auto px-4 -mt-0 py-14">
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {trust.map(([d, t, s], i) => (
            <Reveal key={t} delay={i * 80}>
              <li className="h-full list-none rounded-3xl border border-beige bg-white/70 p-5 md:p-6 text-center hover:shadow-luxe hover:-translate-y-1 transition-all duration-500">
                <span className="mx-auto w-12 h-12 rounded-full bg-ink text-gold grid place-items-center"><Icon d={d} /></span>
                <p className="mt-4 font-bold">{t}</p>
                <p className="mt-1 text-xs md:text-sm opacity-70 leading-6">{s}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* CATEGORIES */}
      {cats.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-6">
          <Reveal>
            <p className="text-goldDeep text-sm tracking-[.25em]">المجموعات</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-2">تسوّقي حسب الفئة</h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {cats.map((c, i) => (
              <Reveal key={c.slug} delay={(i % 4) * 90} scale className={i === 0 ? "col-span-2 md:row-span-2" : ""}>
                <Link href={`/category/${c.slug}`} className={`group card-img block w-full rounded-2xl ${i === 0 ? "aspect-[4/3] md:aspect-auto md:h-full md:min-h-[24rem]" : "aspect-[4/5]"}`}>
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                  <span className={`absolute bottom-4 inset-x-4 text-pearl font-display font-bold ${i === 0 ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"}`}>{c.name_ar}</span>
                  <span className="absolute top-3 end-3 w-9 h-9 grid place-items-center rounded-full bg-gold text-ink opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">←</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 mt-24">
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <p className="text-goldDeep text-sm tracking-[.25em]">وصل حديثاً</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-2">أحدث الإصدارات</h2>
          </div>
          <Link href="/shop" className="u-link text-sm font-bold shrink-0">عرض الكل ←</Link>
        </Reveal>
        {fresh.length === 0 ? (
          <Reveal>
            <div className="mt-10 rounded-3xl border border-dashed border-gold/50 bg-white/60 py-20 text-center">
              <span className="text-4xl text-gold">✦</span>
              <p className="mt-3 font-display text-3xl font-bold">مجموعتنا قادمة قريباً</p>
              <p className="mt-2 text-sm opacity-60">نجهّز لكم قطعاً مختارة بعناية. ترقّبوا الإطلاق.</p>
            </div>
          </Reveal>
        ) : (
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {fresh.map((p, i) => <Reveal key={p.slug} delay={(i % 4) * 90}><ProductCard p={p} cur={cur} /></Reveal>)}
          </div>
        )}
      </section>

      {/* FEATURED COLLECTION */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-28">
          <Reveal>
            <div className="rounded-[2rem] bg-pearl border border-beige p-6 md:p-12 grid lg:grid-cols-[1fr_2fr] gap-10 items-center">
              <div className="text-center lg:text-start">
                <p className="text-goldDeep text-sm tracking-[.25em]">مختارات</p>
                <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold leading-snug">مختارات لؤلؤة</h2>
                <p className="mt-4 leading-8 opacity-75">قطع اخترناها لكِ بعناية، تجمع بين الرقيّ والبساطة.</p>
                <Link href="/shop" className="btn-dark mt-7">تسوّقي المجموعة</Link>
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                {featured.map((p) => <ProductCard key={p.slug} p={p} cur={cur} />)}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* BEST SELLERS (only from real paid orders) */}
      {best.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-28">
          <Reveal>
            <p className="text-goldDeep text-sm tracking-[.25em]">الأكثر طلباً</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-2">الأكثر مبيعاً</h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {best.map((p, i) => <Reveal key={p.slug} delay={i * 90}><ProductCard p={p} cur={cur} /></Reveal>)}
          </div>
        </section>
      )}

      {/* BRAND STORY */}
      <section className="mt-28 bg-ink text-pearl grain relative overflow-hidden">
        <div className="absolute -bottom-32 -start-24 w-96 h-96 rounded-full border border-gold/15 spin-slow" aria-hidden="true" />
        <div className="max-w-4xl mx-auto px-5 py-24 text-center relative">
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
