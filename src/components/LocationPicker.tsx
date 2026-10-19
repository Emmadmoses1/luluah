"use client";
import { useEffect, useRef, useState } from "react";

export type PickedPlace = { name: string; iso2: string; country_ar: string; admin: string | null };

export default function LocationPicker({ picked, onPick, onClear, onManual }: {
  picked: PickedPlace | null; onPick: (p: PickedPlace) => void; onClear: () => void; onManual: () => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PickedPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) { setHits([]); setSearched(false); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/places?scope=delivery&q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) { setHits(d.places ?? []); setSearched(true); setActive(-1); } })
        .catch(() => {});
    }, 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, open]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function choose(p: PickedPlace) { setQ(""); setHits([]); setOpen(false); setMsg(""); onPick(p); }

  function locate() {
    setMsg("");
    if (!navigator.geolocation) { setMsg("متصفحك لا يدعم تحديد الموقع. ابحث بالاسم."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Rounded to about 1 km and used only for this lookup. It is never stored.
        const lat = pos.coords.latitude.toFixed(2), lon = pos.coords.longitude.toFixed(2);
        fetch(`/api/places?scope=delivery&lat=${lat}&lon=${lon}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            const p = d?.places?.[0];
            if (p) choose(p); else setMsg("لم نجد منطقة توصيل قريبة من موقعك. ابحث بالاسم.");
          })
          .catch(() => setMsg("تعذّر تحديد منطقتك. ابحث بالاسم."))
          .finally(() => setLocating(false));
      },
      (err) => {
        setLocating(false);
        setMsg(err.code === 1 ? "لم يتم السماح بالوصول إلى الموقع. يمكنك البحث بالاسم." : "تعذّر تحديد موقعك. يمكنك البحث بالاسم.");
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  function key(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(hits[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  if (picked) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/60 bg-pearl px-4 py-3.5">
        <p className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 shrink-0 rounded-full bg-ink text-gold grid place-items-center" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
          </span>
          <span className="min-w-0"><span className="block font-bold truncate">{picked.name}</span><span className="block text-xs opacity-60">{picked.country_ar}</span></span>
        </p>
        <button type="button" onClick={onClear} className="shrink-0 text-sm underline hover:text-goldDeep">تغيير</button>
      </div>
    );
  }

  return (
    <div ref={box} className="space-y-3">
      <div className="relative">
        <label className="block text-sm font-semibold" htmlFor="loc-search">ابحث عن مدينتك أو منطقتك</label>
        <div className="relative mt-1.5">
          <svg className="absolute top-1/2 -translate-y-1/2 start-4 opacity-50" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input id="loc-search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={key}
            autoComplete="off" inputMode="search" role="combobox" aria-expanded={open && hits.length > 0} aria-controls="loc-list"
            placeholder="مثال: الرياض، المنامة، دبي…"
            className="w-full rounded-2xl border border-beige bg-white ps-12 pe-4 py-4 text-base outline-none focus:border-gold focus:ring-4 focus:ring-gold/20 transition" />
        </div>
        {open && q.trim().length >= 2 && (
          <ul id="loc-list" role="listbox" className="absolute z-30 mt-2 w-full rounded-2xl border border-beige bg-white shadow-luxe overflow-hidden">
            {hits.map((h, i) => (
              <li key={`${h.iso2}-${h.name}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onClick={() => choose(h)}
                  className={`w-full text-start px-4 py-3.5 flex items-center justify-between gap-3 transition-colors ${i === active ? "bg-pearl" : "hover:bg-pearl"}`}>
                  <span className="font-semibold">{h.name}</span>
                  <span className="text-xs opacity-60 shrink-0">{h.country_ar}</span>
                </button>
              </li>
            ))}
            {searched && hits.length === 0 && (
              <li className="px-4 py-4 text-sm leading-7">
                لم نجد «{q.trim()}». جرّب كتابة الاسم بطريقة أخرى، أو{" "}
                <button type="button" onClick={onManual} className="underline font-bold hover:text-goldDeep">أدخل العنوان يدوياً</button>.
              </li>
            )}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <button type="button" onClick={locate} disabled={locating}
          className="inline-flex items-center gap-2 rounded-full border border-gold/60 px-4 py-2 font-semibold hover:bg-gold hover:text-ink transition-colors disabled:opacity-50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          {locating ? "جارٍ تحديد موقعك…" : "استخدم موقعي الحالي"}
        </button>
        <button type="button" onClick={onManual} className="underline opacity-70 hover:opacity-100">لا أجد منطقتي، سأدخل العنوان يدوياً</button>
      </div>
      {msg && <p role="status" className="text-sm text-amber-800">{msg}</p>}
    </div>
  );
}
