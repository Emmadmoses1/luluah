"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart } from "@/lib/cart";

export default function CartLink() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const update = () => setN(readCart().reduce((a, i) => a + i.qty, 0));
    update();
    window.addEventListener("cart-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cart-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return (
    <Link href="/cart" className="flex items-center gap-1">
      السلة
      {n > 0 && <span className="bg-gold text-ink text-xs rounded-full px-2">{n.toLocaleString("ar")}</span>}
    </Link>
  );
}
