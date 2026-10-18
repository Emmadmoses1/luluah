"use client";
import { useEffect, useState } from "react";

export type Img = { path: string; alt: string };

export default function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState("50% 50%");
  const [box, setBox] = useState(false);
  const n = images.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    if (!box) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBox(false);
      if (e.key === "ArrowLeft") setI((x) => (x + 1) % n);
      if (e.key === "ArrowRight") setI((x) => (x - 1 + n) % n);
    };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [box, n]);

  if (n === 0) {
    return <div className="aspect-[3/4] rounded-3xl bg-gradient-to-br from-pearl to-beige flex items-center justify-center text-8xl text-gold/60 font-bold">ل</div>;
  }
  const cur = images[i];
  const arrow = "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur text-ink text-xl grid place-items-center shadow-md hover:bg-gold transition-colors";
  return (
    <div>
      <div className="relative">
        <button type="button" aria-label="تكبير الصورة" onClick={() => setBox(true)}
          onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setPos(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
          className="block w-full aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-pearl to-beige cursor-zoom-in shadow-luxe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={cur.path} src={cur.path} alt={cur.alt || name} className="w-full h-full object-cover transition-transform duration-300"
            style={{ transform: zoom ? "scale(1.8)" : "none", transformOrigin: pos }} />
        </button>
        {n > 1 && (
          <>
            <button type="button" aria-label="الصورة السابقة" onClick={() => go(-1)} className={`${arrow} end-3`}>›</button>
            <button type="button" aria-label="الصورة التالية" onClick={() => go(1)} className={`${arrow} start-3`}>‹</button>
            <span className="absolute bottom-3 start-3 rounded-full bg-ink/70 text-pearl text-xs px-3 py-1">{(i + 1).toLocaleString("ar")} / {n.toLocaleString("ar")}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((im, k) => (
            <button key={im.path} type="button" onClick={() => setI(k)} aria-label={`الصورة ${(k + 1).toLocaleString("ar")}`} aria-current={k === i}
              className={`shrink-0 w-16 h-20 overflow-hidden rounded-xl border-2 transition-all ${k === i ? "border-gold scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.path} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {box && (
        <div className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center p-4" role="dialog" aria-label="عرض الصورة" onClick={() => setBox(false)}>
          <button type="button" onClick={() => setBox(false)} aria-label="إغلاق" className="absolute top-4 start-4 text-pearl text-3xl p-2">✕</button>
          {n > 1 && (
            <>
              <button type="button" aria-label="الصورة التالية" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute start-4 top-1/2 text-pearl text-5xl p-3">‹</button>
              <button type="button" aria-label="الصورة السابقة" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute end-4 top-1/2 text-pearl text-5xl p-3">›</button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.path} alt={cur.alt || name} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
}
