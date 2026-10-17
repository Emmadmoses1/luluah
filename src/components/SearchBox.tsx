"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type S = { products: { slug: string; name_ar: string; image: string | null }[]; categories: { slug: string; name_ar: string }[] };

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [s, setS] = useState<S | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setS(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) { setS(d); setOpen(true); } })
        .catch(() => {});
    }, 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) { setOpen(false); router.push(`/search?q=${encodeURIComponent(q.trim())}`); }
  }
  const empty = s && s.products.length === 0 && s.categories.length === 0;

  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={submit} role="search" action="/search" className="flex">
        <input name="q" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => s && setOpen(true)}
          placeholder="ابحث عن منتج أو فئة" aria-label="بحث" autoComplete="off"
          className="w-full border border-beige bg-white px-4 py-2 text-sm" />
        <button className="bg-ink text-gold px-4 text-sm font-semibold" aria-label="بحث">بحث</button>
      </form>
      {open && s && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-beige shadow-lg max-h-96 overflow-y-auto">
          {s.categories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm bg-pearl border-b border-beige">الفئة: {c.name_ar}</Link>
          ))}
          {s.products.map((p) => (
            <Link key={p.slug} href={`/product/${p.slug}`} onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-pearl">
              <span className="w-10 h-12 bg-beige shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
              </span>
              {p.name_ar}
            </Link>
          ))}
          {empty && <p className="px-4 py-3 text-sm opacity-60">لا توجد نتائج مطابقة.</p>}
          {!empty && (
            <Link href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm font-semibold text-center border-t border-beige">عرض كل النتائج</Link>
          )}
        </div>
      )}
    </div>
  );
}
