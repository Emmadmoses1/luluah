"use client";
import { useEffect, useState } from "react";

export default function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 12);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className={`sticky top-0 z-40 border-b transition-all duration-300 ${scrolled
      ? "bg-ivory/90 backdrop-blur-xl border-beige shadow-[0_10px_30px_-18px_rgba(12,10,9,.35)]" : "bg-ivory border-transparent"}`}>
      {children}
    </header>
  );
}
