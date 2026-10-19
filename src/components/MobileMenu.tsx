"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Logo from "./Logo";

export default function MobileMenu({ cats }: { cats: { slug: string; name_ar: string }[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    closer.current?.focus();
    const trigger = opener.current;
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; trigger?.focus(); };
  }, [open]);

  const close = () => setOpen(false);
  const links = [{ href: "/shop", label: "كل المنتجات" }, ...cats.map((c) => ({ href: `/category/${c.slug}`, label: c.name_ar }))];
  const extra = [["/track", "تتبّع الطلب"], ["/about", "من نحن"], ["/faq", "الأسئلة الشائعة"], ["/contact", "تواصل معنا"]];

  const drawer = (
    <div className={`fixed inset-0 z-[80] ${open ? "visible" : "invisible transition-[visibility] delay-500"}`}>
      <div onClick={close} className={`absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`} />
      <nav aria-label="القائمة الرئيسية"
        className={`absolute top-0 bottom-0 right-0 w-[86%] max-w-sm bg-ink text-pearl flex flex-col transition-transform duration-500 ease-[cubic-bezier(.22,.8,.24,1)] ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <Logo light size={34} />
          <button ref={closer} type="button" onClick={close} aria-label="إغلاق القائمة" className="w-10 h-10 grid place-items-center rounded-full text-xl text-gold hover:bg-white/10">✕</button>
        </div>
        <ul className="flex-1 overflow-y-auto px-5 py-2 text-lg">
          {links.map((l, i) => (
            <li key={l.href} style={{ transitionDelay: `${open ? 80 + i * 30 : 0}ms` }}
              className={`border-b border-white/10 transition-all duration-500 ${open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`}>
              <Link onClick={close} href={l.href} className="flex items-center justify-between py-3.5 hover:text-gold transition-colors">{l.label}<span className="text-gold/60 text-sm">‹</span></Link>
            </li>
          ))}
        </ul>
        <div className="p-5 border-t border-white/10 grid grid-cols-2 gap-x-4 gap-y-3 text-sm opacity-80">
          {extra.map(([h, l]) => <Link key={h} onClick={close} href={h} className="hover:text-gold transition-colors">{l}</Link>)}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <button ref={opener} type="button" aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(true)} className="lg:hidden p-2 -me-2">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 8h16M4 16h10" /></svg>
      </button>
      {mounted && createPortal(drawer, document.body)}
    </>
  );
}
