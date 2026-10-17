"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readCart, setQty } from "@/lib/cart";
import { formatBHD } from "@/lib/money";

type Line = { variantId: string; slug: string; name: string; size: string | null; color: string | null;
  unitMinor: number; qty: number; requested: number; lineMinor: number; available: boolean };

export default function CartPage() {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const items = readCart();
    if (items.length === 0) { setLines([]); setSubtotal(0); return; }
    try {
      const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }) });
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

  if (failed) return <main className="max-w-3xl mx-auto px-4 mt-10"><p>تعذّر تحميل السلة. حاول مرة أخرى.</p></main>;
  if (lines === null) return <main className="max-w-3xl mx-auto px-4 mt-10"><p>جارٍ تحميل السلة…</p></main>;
  if (lines.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 mt-10 text-center">
        <h1 className="text-2xl font-bold">سلتك فارغة</h1>
        <Link href="/" className="inline-block mt-6 bg-ink text-gold px-6 py-3">تابع التسوق</Link>
      </main>
    );
  }
  return (
    <main className="max-w-3xl mx-auto px-4 mt-10">
      <h1 className="text-2xl font-bold mb-6">سلة التسوق</h1>
      <ul className="divide-y divide-beige">
        {lines.map((l) => (
          <li key={l.variantId} className="py-4 flex items-center gap-4">
            <div className="w-16 h-20 bg-gradient-to-br from-pearl to-beige flex items-center justify-center text-2xl text-gold/60 font-bold">ل</div>
            <div className="flex-1 text-sm">
              <p className="font-semibold">{l.name}</p>
              <p className="opacity-60">{[l.size, l.color].filter((x) => x && x !== "—").join(" · ")}</p>
              {!l.available && <p className="text-red-700">غير متوفر حالياً</p>}
              {l.available && l.qty < l.requested && <p className="text-amber-700">عُدِّلت الكمية حسب المتوفر</p>}
              {l.available && <p className="mt-1">{formatBHD(l.unitMinor)}</p>}
            </div>
            {l.available && (
              <div className="flex items-center gap-2">
                <button className="border w-8 h-8" onClick={() => setQty(l.variantId, l.qty - 1)}>−</button>
                <span className="w-6 text-center">{l.qty.toLocaleString("ar")}</span>
                <button className="border w-8 h-8" onClick={() => setQty(l.variantId, l.qty + 1)}>+</button>
              </div>
            )}
            <button className="text-sm underline" onClick={() => setQty(l.variantId, 0)}>إزالة</button>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-beige pt-4 flex justify-between font-bold">
        <span>المجموع الفرعي</span><span>{formatBHD(subtotal)}</span>
      </div>
      <p className="mt-2 text-sm opacity-60">تُحتسب تكلفة الشحن وخيارات التوصيل عند إتمام الطلب.</p>
      <Link href="/checkout" className="mt-6 block text-center w-full bg-ink text-gold py-3 font-bold">إتمام الطلب</Link>
    </main>
  );
}
