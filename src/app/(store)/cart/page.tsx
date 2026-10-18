"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readCart, setQty } from "@/lib/cart";
import { formatBHD } from "@/lib/money";

type Line = { variantId: string; slug: string; name: string; image: string | null; size: string | null; color: string | null;
  unitMinor: number; qty: number; requested: number; lineMinor: number; available: boolean };

export default function CartPage() {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const items = readCart();
    if (items.length === 0) { setLines([]); setSubtotal(0); return; }
    try {
      const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      if (!r.ok) throw new Error("bad");
      const d = await r.json();
      setLines(d.lines); setSubtotal(d.subtotalMinor); setFailed(false);
    } catch { setFailed(true); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("cart-changed", load);
    return () => window.removeEventListener("cart-changed", load);
  }, [load]);

  const wrap = "max-w-6xl mx-auto px-4 mt-10";
  const step = "w-9 h-9 rounded-full border border-beige bg-white hover:border-gold hover:text-goldDeep transition-colors";
  if (failed) return <main className={wrap}><p role="alert">تعذّر تحميل السلة. حاول مرة أخرى.</p></main>;
  if (lines === null) {
    return <main className={wrap} aria-busy="true"><div className="skeleton h-10 w-48 rounded-full" /><div className="skeleton mt-8 h-40 rounded-3xl" /></main>;
  }
  if (lines.length === 0) {
    return (
      <main className="max-w-xl mx-auto px-4 py-24 text-center">
        <span className="text-5xl text-gold">✦</span>
        <h1 className="mt-4 font-display text-4xl font-bold">سلتك فارغة</h1>
        <p className="mt-2 opacity-60">اكتشفي مجموعتنا وأضيفي ما يعجبك.</p>
        <Link href="/shop" className="btn-dark mt-8">تابع التسوق</Link>
      </main>
    );
  }
  return (
    <main className={wrap}>
      <h1 className="font-display text-4xl md:text-5xl font-bold">سلة التسوق</h1>
      <div className="mt-8 grid lg:grid-cols-[1fr_22rem] gap-8 items-start">
        <ul className="space-y-4">
          {lines.map((l) => (
            <li key={l.variantId} className="rounded-3xl border border-beige bg-white/70 p-4 flex gap-4">
              <Link href={l.slug ? `/product/${l.slug}` : "#"} className="shrink-0 w-24 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-pearl to-beige flex items-center justify-center text-3xl text-gold/60 font-bold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.image ? <img src={l.image} alt={l.name} loading="lazy" className="w-full h-full object-cover" /> : "ل"}
              </Link>
              <div className="flex-1 min-w-0 flex flex-col text-sm">
                <p className="font-bold leading-6">{l.name}</p>
                <p className="opacity-60">{[l.size, l.color].filter((x) => x && x !== "—").join(" · ")}</p>
                {!l.available && <p className="text-red-700">غير متوفر حالياً</p>}
                {l.available && l.qty < l.requested && <p className="text-amber-700">عُدِّلت الكمية حسب المتوفر</p>}
                <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-3">
                  {l.available ? (
                    <div className="flex items-center gap-2">
                      <button className={step} aria-label="إنقاص الكمية" onClick={() => setQty(l.variantId, l.qty - 1)}>−</button>
                      <span className="w-6 text-center font-bold">{l.qty.toLocaleString("ar")}</span>
                      <button className={step} aria-label="زيادة الكمية" onClick={() => setQty(l.variantId, l.qty + 1)}>+</button>
                    </div>
                  ) : <span />}
                  <div className="text-end">
                    {l.available && <p className="font-bold">{formatBHD(l.lineMinor)}</p>}
                    <button className="text-xs underline opacity-60 hover:opacity-100" onClick={() => setQty(l.variantId, 0)}>إزالة</button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="rounded-3xl bg-ink text-pearl p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-2xl font-bold text-gold">ملخص السلة</h2>
          <p className="mt-5 flex justify-between text-lg font-bold"><span>المجموع الفرعي</span><span>{formatBHD(subtotal)}</span></p>
          <p className="mt-3 text-xs opacity-60 leading-6">تُحتسب تكلفة الشحن وخيارات التوصيل عند إتمام الطلب.</p>
          <Link href="/checkout" className="btn-gold mt-6 w-full">إتمام الطلب</Link>
          <Link href="/shop" className="mt-3 block text-center text-sm opacity-70 hover:text-gold">متابعة التسوق</Link>
        </aside>
      </div>
    </main>
  );
}
