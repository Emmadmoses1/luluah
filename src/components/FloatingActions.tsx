"use client";
import { useEffect, useState } from "react";

export default function FloatingActions({ whatsapp }: { whatsapp: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const f = () => setShow(window.scrollY > 700);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const wa = whatsapp.replace(/\D/g, "");
  return (
    <div className="fixed z-30 bottom-24 md:bottom-6 end-4 flex flex-col gap-3">
      {wa && (
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="تواصل معنا عبر واتساب"
          className="w-12 h-12 rounded-full bg-[#25D366] text-white grid place-items-center shadow-lg hover:scale-110 transition-transform">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          </svg>
        </a>
      )}
      <button type="button" aria-label="العودة إلى الأعلى" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`w-12 h-12 rounded-full bg-ink text-gold grid place-items-center shadow-lg hover:bg-gold hover:text-ink transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      </button>
    </div>
  );
}
