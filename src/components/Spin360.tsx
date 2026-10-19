"use client";
import { useEffect, useRef, useState } from "react";
import { frameFromDrag } from "@/lib/zoom";

export default function Spin360({ frames, name }: { frames: { path: string; alt: string }[]; name: string }) {
  const n = frames.length;
  const [f, setF] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [auto, setAuto] = useState(false);
  const drag = useRef<{ x: number; f: number } | null>(null);

  useEffect(() => {
    let done = 0, dead = false;
    frames.forEach((fr) => {
      const im = new Image();
      const fin = () => { if (!dead) setLoaded(++done); };
      im.onload = fin; im.onerror = fin; im.src = fr.path;
    });
    return () => { dead = true; };
  }, [frames]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setF((x) => (x + 1) % n), 110);
    return () => clearInterval(t);
  }, [auto, n]);

  const ready = loaded >= n;
  return (
    <div role="img" aria-label={`${name} — عرض ٣٦٠ درجة، استخدم الأسهم للتدوير`} tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") { setAuto(false); setF((x) => (x + 1) % n); }
        if (e.key === "ArrowRight") { setAuto(false); setF((x) => (x - 1 + n) % n); }
      }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, f }; setAuto(false); }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setF(frameFromDrag(drag.current.f, e.clientX - drag.current.x, e.currentTarget.getBoundingClientRect().width, n));
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-pearl to-beige shadow-luxe select-none touch-pan-y cursor-grab active:cursor-grabbing">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frames[f].path} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" />
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-ivory/80 text-sm">
          <p>جارٍ تحميل العرض ٣٦٠° ({loaded.toLocaleString("ar")} / {n.toLocaleString("ar")})</p>
        </div>
      ) : (
        <>
          <span className="absolute bottom-3 start-3 rounded-full bg-ink/75 text-pearl text-xs px-3 py-1.5">اسحب لتدوير المنتج</span>
          <button type="button" onClick={() => setAuto((a) => !a)} aria-pressed={auto}
            className="absolute bottom-3 end-3 rounded-full bg-white/90 text-ink text-xs font-bold px-3 py-1.5 hover:bg-gold transition-colors">
            {auto ? "إيقاف" : "تشغيل تلقائي"}
          </button>
        </>
      )}
    </div>
  );
}
