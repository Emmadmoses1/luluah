"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readCart, setQty } from "@/lib/cart";
import { formatBHD } from "@/lib/money";
import { BHD, formatMoney, type Cur } from "@/lib/currency";

type Line = { variantId: string; slug: string; name: string; image: string | null; size: string | null; color: string | null;
  unitMinor: number; qty: number; requested: number; lineMinor: number; available: boolean; minQty: number; maxQty: number };

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

function QtyInput({ line }: { line: Line }) {
  const [v, setV] = useState(String(line.qty));
  useEffect(() => { setV(String(line.qty)); }, [line.qty]);
  const commit = (raw: string) => {
    const n = Math.floor(Number(digits(raw)));
    const q = Number.isFinite(n) ? Math.min(line.maxQty, Math.max(line.minQty, n)) : line.qty;
    setV(String(q));
    if (q !== line.qty) setQty(line.variantId, q);
  };
  const step = "w-9 h-9 rounded-full border border-beige bg-white hover:border-gold hover:text-goldDeep transition-colors disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={step} aria-label="إنقاص الكمية" disabled={line.qty <= line.minQty} onClick={() => commit(String(line.qty - 1))}>−</button>
      <input value={v} inputMode="numeric" aria-label="الكمية" onChange={(e) => setV(e.target.value)} onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(v); } }}
        className="w-20 text-center rounded-full border border-beige bg-white py-1.5 font-bold outline-none focus:border-gold focus:ring-4 focus:ring-gold/20" />
      <button type="button" className={step} aria-label="زيادة الكمية" disabled={line.qty >= line.maxQty} onClick={() => commit(String(line.qty + 1))}>+</button>
    </div>
  );
}

export default function CartPage() {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [cur, setCur] = useState<Cur>(BHD);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const items = readCart();
    if (items.length === 0) { setLines([]); setSubtotal(0); return; }
    try {
      const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || !Array.isArray(d.lines)) throw new Error("bad response");
      setLines(d.lines); setSubtotal(Number(d.subtotalMinor) || 0); setFailed(false);
      if (d.display && typeof d.display.code === "string") setCur({ code: d.display.code, decimals: Number(d.display.decimals), rate: Number(d.display.rate) });
      // Keep the saved cart in line with the allowed quantities.
      for (const l of d.lines as Line[]) if (l.available && l.qty !== l.requested) setQty(l.variantId, l.qty);
    } catch { setFailed(true); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("cart-changed", load);
    return () => window.removeEventListener("cart-changed", load);
  }, [load]);

  const wrap = "max-w-6xl mx-auto px-4 mt-10";
  if (failed) return <main className={wrap}><p role="alert">تعذّر تحميل السلة. <button className="underline" onClick={() => { setFailed(false); load(); }}>حاول مرة أخرى</button></p></main>;
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
  const showLocal = cur.code !== "BHD";
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
                {l.available && l.qty !== l.requested && <p className="text-amber-700">عُدِّلت الكمية لتوافق الحد المسموح</p>}
                {l.available && <p className="text-xs opacity-50">الكمية المسموحة: {l.minQty.toLocaleString("ar")} – {l.maxQty.toLocaleString("ar")}</p>}
                <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-3">
                  {l.available ? <QtyInput line={l} /> : <span />}
                  <div className="text-end">
                    {l.available && <p className="font-bold">{formatBHD(l.lineMinor)}</p>}
                    {l.available && showLocal && <p className="text-xs opacity-60">≈ {formatMoney(l.lineMinor, cur)}</p>}
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
          {showLocal && <p className="mt-1 text-sm opacity-70 text-end">≈ {formatMoney(subtotal, cur)}</p>}
          <p className="mt-3 text-xs opacity-60 leading-6">تُحتسب تكلفة الشحن وخيارات التوصيل عند إتمام الطلب. السعر الأساسي والدفع بالدينار البحريني{showLocal ? "، والمبلغ بعملتك تقريبي حسب سعر الصرف" : ""}.</p>
          <Link href="/checkout" className="btn-gold mt-6 w-full">إتمام الطلب</Link>
          <Link href="/shop" className="mt-3 block text-center text-sm opacity-70 hover:text-gold">متابعة التسوق</Link>
        </aside>
      </div>
    </main>
  );
}
