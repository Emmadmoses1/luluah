"use client";
import { useEffect, useState } from "react";

export type Img = { path: string; alt: string };

export default function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState("50% 50%");
  const [box, setBox] = useState(false);
  const n = images.length;

  useEffect(() => {
    if (!box) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setBox(false); };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [box]);

  if (n === 0) {
    return <div className="aspect-[3/4] bg-gradient-to-br from-pearl to-beige flex items-center justify-center text-8xl text-gold/60 font-bold">ل</div>;
  }
  const cur = images[i];
  return (
    <div>
      <button type="button" aria-label="تكبير الصورة" onClick={() => setBox(true)}
        onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        className="block w-full aspect-[3/4] overflow-hidden bg-gradient-to-br from-pearl to-beige cursor-zoom-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.path} alt={cur.alt || name} className="w-full h-full object-cover transition-transform duration-200"
          style={{ transform: zoom ? "scale(1.8)" : "none", transformOrigin: pos }} />
      </button>
      {n > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((im, k) => (
            <button key={im.path} type="button" onClick={() => setI(k)} aria-label={`الصورة ${(k + 1).toLocaleString("ar")}`}
              className={`shrink-0 w-16 h-20 overflow-hidden border-2 ${k === i ? "border-gold" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.path} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {box && (
        <div className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center p-4" role="dialog" aria-label="عرض الصورة">
          <button type="button" onClick={() => setBox(false)} aria-label="إغلاق" className="absolute top-4 start-4 text-pearl text-3xl p-2">✕</button>
          {n > 1 && (
            <>
              <button type="button" aria-label="الصورة التالية" onClick={() => setI((i + 1) % n)} className="absolute start-4 top-1/2 text-pearl text-4xl p-3">‹</button>
              <button type="button" aria-label="الصورة السابقة" onClick={() => setI((i - 1 + n) % n)} className="absolute end-4 top-1/2 text-pearl text-4xl p-3">›</button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.path} alt={cur.alt || name} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
