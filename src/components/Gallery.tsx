"use client";
import { useEffect, useRef, useState } from "react";
import Spin360 from "./Spin360";
import { clampPan, clampScale } from "@/lib/zoom";

export type Img = { path: string; alt: string };
type Mode = "zoom" | "tilt" | "spin";

function Lightbox({ src, alt, onClose, onPrev, onNext }: { src: string; alt: string; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const tr = useRef(t);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const ref = useRef({ dist: 1, s: 1, x: 0, y: 0, px: 0, py: 0 });
  useEffect(() => { tr.current = t; }, [t]);

  const apply = (s: number, x: number, y: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const ss = clampScale(s);
    const p = clampPan(ss, x, y, r.width, r.height);
    setT({ s: ss, x: p.x, y: p.y });
  };
  const begin = () => {
    const pts = [...ptrs.current.values()], cur = tr.current;
    if (pts.length >= 2) ref.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, s: cur.s, x: cur.x, y: cur.y, px: 0, py: 0 };
    else if (pts.length === 1) ref.current = { dist: 1, s: cur.s, x: cur.x, y: cur.y, px: pts[0].x, py: pts[0].y };
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNext?.();
      if (e.key === "ArrowRight") onPrev?.();
    };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose, onNext, onPrev]);

  const ctl = "w-11 h-11 rounded-full bg-white/15 text-pearl text-xl grid place-items-center backdrop-blur hover:bg-gold hover:text-ink transition-colors";
  return (
    <div className="fixed inset-0 z-[70] bg-ink/95" role="dialog" aria-modal="true" aria-label="عرض الصورة">
      <div ref={box} className="absolute inset-0 overflow-hidden touch-none select-none flex items-center justify-center"
        style={{ cursor: t.s > 1 ? "grab" : "zoom-in" }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); begin(); }}
        onPointerMove={(e) => {
          if (!ptrs.current.has(e.pointerId)) return;
          ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const pts = [...ptrs.current.values()];
          if (pts.length >= 2) apply(ref.current.s * (Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / ref.current.dist), ref.current.x, ref.current.y);
          else if (tr.current.s > 1) apply(tr.current.s, ref.current.x + (e.clientX - ref.current.px), ref.current.y + (e.clientY - ref.current.py));
        }}
        onPointerUp={(e) => { ptrs.current.delete(e.pointerId); begin(); }}
        onPointerCancel={(e) => { ptrs.current.delete(e.pointerId); begin(); }}
        onDoubleClick={() => (tr.current.s > 1 ? apply(1, 0, 0) : apply(2.5, 0, 0))}
        onWheel={(e) => apply(tr.current.s * (e.deltaY < 0 ? 1.15 : 0.87), tr.current.x, tr.current.y)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} draggable={false} className="max-h-full max-w-full object-contain"
          style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }} />
      </div>
      <button ref={closeBtn} type="button" onClick={onClose} aria-label="إغلاق" className={`${ctl} absolute top-4 start-4`}>✕</button>
      {onNext && <button type="button" onClick={onNext} aria-label="الصورة التالية" className={`${ctl} absolute start-4 top-1/2 -translate-y-1/2`}>‹</button>}
      {onPrev && <button type="button" onClick={onPrev} aria-label="الصورة السابقة" className={`${ctl} absolute end-4 top-1/2 -translate-y-1/2`}>›</button>}
      <div className="absolute bottom-5 inset-x-0 flex justify-center gap-3">
        <button type="button" aria-label="تصغير" className={ctl} onClick={() => apply(tr.current.s * 0.8, tr.current.x, tr.current.y)}>−</button>
        <button type="button" aria-label="إعادة الضبط" className={ctl} onClick={() => apply(1, 0, 0)}>⟲</button>
        <button type="button" aria-label="تكبير" className={ctl} onClick={() => apply(tr.current.s * 1.3, tr.current.x, tr.current.y)}>+</button>
      </div>
    </div>
  );
}

export default function Gallery({ images, name, spin = false }: { images: Img[]; name: string; spin?: boolean }) {
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<Mode>("zoom");
  const [box, setBox] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState("50% 50%");
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, on: false });
  const [reduce, setReduce] = useState(false);
  useEffect(() => { setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  const n = images.length;
  const canSpin = spin && n >= 8;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  if (n === 0) {
    return <div className="aspect-[3/4] rounded-3xl bg-gradient-to-br from-pearl to-beige flex items-center justify-center text-8xl text-gold/60 font-bold">ل</div>;
  }
  const cur = images[i];
  const arrow = "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur text-ink text-xl grid place-items-center shadow-md hover:bg-gold transition-colors";
  const modes: [Mode, string][] = [["zoom", "تكبير"], ["tilt", "عرض ثلاثي الأبعاد (إمالة)"], ...(canSpin ? ([["spin", "دوران ٣٦٠°"]] as [Mode, string][]) : [])];

  return (
    <div>
      <div className="relative">
        {mode === "spin" && canSpin ? (
          <Spin360 frames={images} name={name} />
        ) : (
          <>
            <div style={{ perspective: "900px" }}>
              <button type="button" aria-label="فتح الصورة بملء الشاشة" onClick={() => setBox(true)}
                onPointerEnter={(e) => { if (e.pointerType === "mouse" && mode === "zoom") setZoom(true); }}
                onPointerLeave={() => { setZoom(false); setTilt((t) => ({ ...t, rx: 0, ry: 0, on: false })); }}
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
                  if (mode === "zoom") setPos(`${px * 100}% ${py * 100}%`);
                  else if (mode === "tilt" && !reduce) setTilt({ rx: (0.5 - py) * 18, ry: (px - 0.5) * 22, gx: px * 100, gy: py * 100, on: true });
                }}
                className="relative block w-full aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-pearl to-beige shadow-luxe cursor-zoom-in touch-pan-y"
                style={mode === "tilt" ? {
                  transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                  transition: tilt.on ? "transform 60ms linear" : "transform .5s cubic-bezier(.22,.8,.24,1)",
                } : undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={cur.path} src={cur.path} alt={cur.alt || name} className="w-full h-full object-cover"
                  style={{ transform: mode === "zoom" && zoom ? "scale(1.8)" : mode === "tilt" ? "scale(1.06)" : "none", transformOrigin: pos, transition: "transform .3s" }} />
                {mode === "tilt" && (
                  <span aria-hidden className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,.38), transparent 55%)`, opacity: tilt.on ? 1 : 0, transition: "opacity .3s" }} />
                )}
              </button>
            </div>
            {n > 1 && (
              <>
                <button type="button" aria-label="الصورة السابقة" onClick={() => go(-1)} className={`${arrow} end-3`}>›</button>
                <button type="button" aria-label="الصورة التالية" onClick={() => go(1)} className={`${arrow} start-3`}>‹</button>
                <span className="absolute bottom-3 start-3 rounded-full bg-ink/70 text-pearl text-xs px-3 py-1">{(i + 1).toLocaleString("ar")} / {n.toLocaleString("ar")}</span>
              </>
            )}
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs" role="group" aria-label="طريقة العرض">
        {modes.map(([m, label]) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={`rounded-full border px-3.5 py-1.5 transition-colors ${mode === m ? "bg-ink text-gold border-ink" : "border-beige bg-white hover:border-gold"}`}>{label}</button>
        ))}
      </div>
      {mode === "tilt" && <p className="mt-2 text-xs opacity-60">تأثير إمالة ثلاثي الأبعاد للصورة، وليس نموذجاً ثلاثي الأبعاد حقيقياً.</p>}

      {n > 1 && mode !== "spin" && (
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
      {box && <Lightbox key={cur.path} src={cur.path} alt={cur.alt || name} onClose={() => setBox(false)} onPrev={n > 1 ? () => go(-1) : undefined} onNext={n > 1 ? () => go(1) : undefined} />}
    </div>
  );
}
