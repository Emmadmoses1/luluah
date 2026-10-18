"use client";
import { useState } from "react";
import Link from "next/link";
import { addToCart } from "@/lib/cart";

export type VariantOpt = { id: string; size: string | null; color_ar: string | null; stock: number };

const label = (v: VariantOpt) =>
  [v.size, v.color_ar].filter((x) => x && x !== "—").join(" · ") || "الخيار القياسي";

export default function AddToCart({ variants }: { variants: VariantOpt[] }) {
  const first = variants.find((v) => v.stock > 0)?.id ?? "";
  const [sel, setSel] = useState(first);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(0);
  const cur = variants.find((v) => v.id === sel);
  const max = Math.max(1, Math.min(cur?.stock ?? 1, 10));
  const step = "w-10 h-10 rounded-full border border-beige bg-white text-lg hover:border-gold hover:text-goldDeep transition-colors disabled:opacity-40";

  return (
    <div className="mt-8">
      {variants.length > 1 && (
        <>
          <p className="text-sm font-semibold mb-3">اختر الخيار</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" disabled={v.stock === 0} aria-pressed={v.id === sel}
                onClick={() => { setSel(v.id); setQty(1); setAdded(0); }}
                className={`rounded-full border px-4 py-2 text-sm transition-all ${v.id === sel ? "bg-ink text-gold border-ink shadow-md" : "border-beige bg-white hover:border-gold"} ${v.stock === 0 ? "opacity-40 line-through cursor-not-allowed" : ""}`}>
                {label(v)}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-6 flex items-center gap-4">
        <span className="text-sm font-semibold">الكمية</span>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="إنقاص الكمية" className={step} disabled={qty <= 1} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span className="w-6 text-center font-bold">{qty.toLocaleString("ar")}</span>
          <button type="button" aria-label="زيادة الكمية" className={step} disabled={qty >= max} onClick={() => setQty(Math.min(max, qty + 1))}>+</button>
        </div>
      </div>
      <button type="button" disabled={!cur || cur.stock === 0}
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
