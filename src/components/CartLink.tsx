"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart } from "@/lib/cart";

export default function CartLink() {
  const [n, setN] = useState(0);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    const update = () => { setN(readCart().reduce((a, i) => a + i.qty, 0)); setBump((b) => b + 1); };
    update();
    window.addEventListener("cart-changed", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("cart-changed", update); window.removeEventListener("storage", update); };
  }, []);
  return (
    <Link href="/cart" aria-label="سلة التسوق" className="relative inline-flex items-center gap-2 p-2 hover:text-goldDeep transition-colors">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {n > 0 && (
        <span key={bump} className="badge-pop absolute -top-0.5 -start-0.5 min-w-[1.25rem] h-5 px-1 grid place-items-center rounded-full bg-gold text-ink text-[11px] font-bold">
          {n.toLocaleString("ar")}
        </span>
      )}
    </Link>
  );
}
