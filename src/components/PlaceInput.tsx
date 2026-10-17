"use client";
import { useEffect, useRef, useState } from "react";

type City = { name_ar: string | null; name_en: string; admin_name: string | null };

export default function PlaceInput({ country, value, onChange, label, required, className }: {
  country: string; value: string; onChange: (v: string) => void; label: string; required?: boolean; className: string;
}) {
  const [items, setItems] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = value.trim();
    if (!open || term.length < 2) { setItems([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/places?country=${country}&q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) { setItems(d.cities ?? []); setActive(-1); } })
        .catch(() => {});
    }, 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [value, country, open]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (c: City) => { onChange(c.name_ar ?? c.name_en); setOpen(false); setItems([]); };
  function key(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <label className="block text-sm font-semibold">{label}{required ? " *" : ""}
        <input value={value} required={required} autoComplete="off" role="combobox" aria-expanded={open && items.length > 0}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }} onKeyDown={key} className={className} />
      </label>
      {open && items.length > 0 && (
        <ul role="listbox" className="absolute z-30 mt-1 w-full rounded-2xl border border-beige bg-white shadow-luxe overflow-hidden">
          {items.map((c, i) => (
            <li key={`${c.name_en}-${i}`} role="option" aria-selected={i === active}>
              <button type="button" onClick={() => pick(c)}
                className={`w-full text-start px-4 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors ${i === active ? "bg-pearl" : "hover:bg-pearl"}`}>
                <span>{c.name_ar ?? c.name_en}</span>
                {c.admin_name && <span dir="ltr" className="text-xs opacity-50 truncate">{c.admin_name}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
