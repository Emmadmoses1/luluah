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
  const [added, setAdded] = useState(false);
  const cur = variants.find((v) => v.id === sel);
  const max = Math.min(cur?.stock ?? 1, 10);

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold mb-2">اختر الخيار</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <button key={v.id} type="button" disabled={v.stock === 0}
            onClick={() => { setSel(v.id); setQty(1); setAdded(false); }}
            className={`border px-3 py-1 text-sm ${v.id === sel ? "bg-ink text-pearl border-ink" : "border-ink"} ${v.stock === 0 ? "opacity-40 line-through cursor-not-allowed" : ""}`}>
            {label(v)}
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm">الكمية</span>
        <button type="button" className="border w-8 h-8" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
        <span className="w-6 text-center">{qty.toLocaleString("ar")}</span>
        <button type="button" className="border w-8 h-8" onClick={() => setQty(Math.min(max, qty + 1))}>+</button>
      </div>
      <button type="button" disabled={!cur || cur.stock === 0}
        onClick={() => { addToCart(sel, qty); setAdded(true); }}
        className="mt-5 w-full bg-ink text-gold py-3 font-bold disabled:opacity-40">
        {cur && cur.stock > 0 ? "أضف إلى السلة" : "نفد المخزون"}
      </button>
      {added && (
        <p className="mt-3 text-sm text-green-700">
          تمت الإضافة إلى السلة. <Link href="/cart" className="underline">عرض السلة</Link>
        </p>
      )}
    </div>
  );
}
