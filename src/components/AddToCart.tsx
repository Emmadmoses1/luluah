"use client";
import { useState } from "react";
import Link from "next/link";
import { addToCart } from "@/lib/cart";
import { limitsFor } from "@/lib/qty";

export type VariantOpt = { id: string; size: string | null; color_ar: string | null; stock: number };

const label = (v: VariantOpt) =>
  [v.size, v.color_ar].filter((x) => x && x !== "—").join(" · ") || "الخيار القياسي";
const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

export default function AddToCart({ variants, minQty, maxQty }: { variants: VariantOpt[]; minQty: number; maxQty: number }) {
  const first = variants.find((v) => v.stock > 0)?.id ?? "";
  const lim = (id: string) => { const v = variants.find((x) => x.id === id); return v ? limitsFor(v.stock, minQty, maxQty) : { min: 0, max: 0 }; };
  const [sel, setSel] = useState(first);
  const [text, setText] = useState(String(lim(first).min || 1));
  const [added, setAdded] = useState(0);
  const cur = variants.find((v) => v.id === sel);
  const l = lim(sel);
  const parsed = Math.floor(Number(digits(text)));
  const qty = Number.isFinite(parsed) ? Math.min(l.max, Math.max(l.min, parsed)) : l.min;
  const commit = (n: number) => setText(String(Math.min(l.max, Math.max(l.min, n))));
  const step = "w-10 h-10 rounded-full border border-beige bg-white text-lg hover:border-gold hover:text-goldDeep transition-colors disabled:opacity-40";
  const chip = "rounded-full border border-beige bg-white px-3 py-1 text-xs hover:border-gold disabled:opacity-40";

  return (
    <div className="mt-8">
      {variants.length > 1 && (
        <>
          <p className="text-sm font-semibold mb-3">اختر الخيار</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" disabled={v.stock === 0} aria-pressed={v.id === sel}
                onClick={() => { setSel(v.id); setText(String(lim(v.id).min || 1)); setAdded(0); }}
                className={`rounded-full border px-4 py-2 text-sm transition-all ${v.id === sel ? "bg-ink text-gold border-ink shadow-md" : "border-beige bg-white hover:border-gold"} ${v.stock === 0 ? "opacity-40 line-through cursor-not-allowed" : ""}`}>
                {label(v)}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold">الكمية</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="إنقاص الكمية" className={step} disabled={qty <= l.min} onClick={() => commit(qty - 1)}>−</button>
            <input value={text} inputMode="numeric" aria-label="الكمية" onChange={(e) => setText(e.target.value)}
              onBlur={() => commit(qty)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(qty); } }}
              className="w-24 text-center rounded-full border border-beige bg-white py-2 font-bold outline-none focus:border-gold focus:ring-4 focus:ring-gold/20" />
            <button type="button" aria-label="زيادة الكمية" className={step} disabled={qty >= l.max} onClick={() => commit(qty + 1)}>+</button>
          </div>
        </div>
        {l.max > 0 && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {[10, 100, 1000].map((n) => <button key={n} type="button" className={chip} disabled={qty >= l.max} onClick={() => commit(qty + n)}>+{n.toLocaleString("ar")}</button>)}
              <button type="button" className={chip} onClick={() => commit(l.min)}>الحد الأدنى</button>
            </div>
            <p className="mt-2 text-xs opacity-60">الكمية المسموحة: من {l.min.toLocaleString("ar")} إلى {l.max.toLocaleString("ar")}</p>
          </>
        )}
      </div>
      <button type="button" disabled={!cur || cur.stock === 0 || l.max === 0}
        onClick={() => { addToCart(sel, qty); setAdded((n) => n + 1); }}
        className="btn-gold mt-6 w-full !py-4 text-base disabled:opacity-40 disabled:hover:translate-y-0">
        {cur && cur.stock > 0 ? "أضف إلى السلة" : "نفد المخزون"}
      </button>
      {added > 0 && (
        <p key={added} role="status" className="badge-pop mt-4 rounded-2xl bg-emerald-50 text-emerald-900 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>✓ تمت الإضافة إلى السلة</span>
          <Link href="/cart" className="font-bold underline">عرض السلة</Link>
        </p>
      )}
    </div>
  );
}
