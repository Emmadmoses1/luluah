"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function MobileMenu({ cats }: { cats: { slug: string; name_ar: string }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(true)} className="md:hidden p-2 -ms-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/60" onClick={close} />
          <nav aria-label="القائمة الرئيسية" className="absolute top-0 bottom-0 right-0 w-4/5 max-w-xs bg-ivory overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gold text-xl">لؤلؤة</span>
              <button type="button" onClick={close} aria-label="إغلاق" className="p-2 text-xl">✕</button>
            </div>
            <ul className="divide-y divide-beige text-sm">
              <li><Link onClick={close} className="block py-3 font-semibold" href="/shop">كل المنتجات</Link></li>
              {cats.map((c) => <li key={c.slug}><Link onClick={close} className="block py-3" href={`/category/${c.slug}`}>{c.name_ar}</Link></li>)}
              <li><Link onClick={close} className="block py-3 font-semibold" href="/track">تتبّع الطلب</Link></li>
              <li><Link onClick={close} className="block py-3" href="/about">من نحن</Link></li>
              <li><Link onClick={close} className="block py-3" href="/contact">تواصل معنا</Link></li>
              <li><Link onClick={close} className="block py-3" href="/faq">الأسئلة الشائعة</Link></li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
