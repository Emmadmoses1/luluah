"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

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
      <button type="button" aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(true)} className="lg:hidden p-2 -me-2">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 8h16M4 16h10" /></svg>
      </button>
      <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={close} className={`absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`} />
        <nav aria-label="القائمة الرئيسية"
          className={`absolute top-0 bottom-0 right-0 w-[85%] max-w-sm bg-ink text-pearl overflow-y-auto p-6 transition-transform duration-500 ease-[cubic-bezier(.22,.8,.24,1)] ${open ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex justify-between items-center mb-8">
            <Logo light size={34} />
            <button type="button" onClick={close} aria-label="إغلاق" className="p-2 text-2xl text-gold">✕</button>
          </div>
          <ul className="text-lg">
            {[{ slug: "", name_ar: "كل المنتجات", href: "/shop" }, ...cats.map((c) => ({ ...c, href: `/category/${c.slug}` }))].map((c, i) => (
              <li key={c.href} style={{ transitionDelay: `${open ? 80 + i * 35 : 0}ms` }}
                className={`border-b border-white/10 transition-all duration-500 ${open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`}>
                <Link onClick={close} className="block py-3.5 hover:text-gold transition-colors" href={c.href}>{c.name_ar}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid gap-3">
            <Link onClick={close} href="/track" className="btn-ghost">تتبّع الطلب</Link>
            <Link onClick={close} href="/contact" className="text-center text-sm opacity-70 hover:text-gold">تواصل معنا</Link>
          </div>
        </nav>
      </div>
    </>
  );
}
