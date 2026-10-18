"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type P = { slug: string; name_ar: string; price_minor: string; sale_price_minor: string | null; image: string | null };
const KEY = "luluah_recent_v1";

export default function RecentlyViewed({ currentSlug }: { currentSlug?: string }) {
  const [items, setItems] = useState<P[]>([]);
  useEffect(() => {
    let slugs: string[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(raw)) slugs = raw.filter((x) => typeof x === "string").slice(0, 12);
      if (currentSlug) {
        slugs = [currentSlug, ...slugs.filter((s) => s !== currentSlug)].slice(0, 12);
        localStorage.setItem(KEY, JSON.stringify(slugs));
      }
    } catch {}
    const others = slugs.filter((s) => s !== currentSlug).slice(0, 6);
    if (others.length === 0) return;
    fetch(`/api/products/recent?slugs=${encodeURIComponent(others.join(","))}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setItems(d))
      .catch(() => {});
  }, [currentSlug]);
  if (items.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 mt-20">
      <h2 className="font-display text-3xl font-bold mb-6">شاهدتها مؤخراً</h2>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
        {items.map((p) => (
          <Link key={p.slug} href={`/product/${p.slug}`} className="group block text-xs">
            <div className="card-img aspect-[3/4] rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image && <img src={p.image} alt={p.name_ar} loading="lazy" className="w-full h-full object-cover" />}
            </div>
            <p className="mt-2 font-semibold leading-5 line-clamp-2 group-hover:text-goldDeep transition-colors">{p.name_ar}</p>
            <p className="opacity-70">{formatMoney(p.sale_price_minor ?? p.price_minor)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
