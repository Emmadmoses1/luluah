"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearCart, readCart } from "@/lib/cart";
import { formatBHD } from "@/lib/money";
import { BH_REGIONS, shippingFor } from "@/lib/shipping";
import PlaceInput from "./PlaceInput";

export type CountryOpt = {
  iso2: string; name_ar: string; dial_code: string; fee_minor: number; free_over_minor: number | null;
  min_order_minor: number; eta_min_days: number | null; eta_max_days: number | null;
  postal_regex: string | null; postal_hint: string | null;
};
type Line = { variantId: string; name: string; size: string | null; color: string | null;
  unitMinor: number; qty: number; lineMinor: number; available: boolean };
type Hit = { code: string; place_name: string; admin_name: string | null };

const KEYS = ["region", "city", "area", "block", "road", "street", "building", "apartment", "postal", "landmark"];
const input = "mt-1.5 w-full rounded-xl border border-beige bg-white px-4 py-3 outline-none focus:border-gold focus:ring-4 focus:ring-gold/20 transition";
const card = "rounded-3xl border border-beige bg-white/70 backdrop-blur p-5 md:p-7 space-y-4";
const toWestern = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

export default function CheckoutForm({ countries }: { countries: CountryOpt[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [iso, setIso] = useState(countries.find((c) => c.iso2 === "BH")?.iso2 ?? countries[0].iso2);
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; amountMinor: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const c = countries.find((x) => x.iso2 === iso)!;
  const bh = iso === "BH";
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const put = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const items = readCart();
    if (items.length === 0) { setLines([]); return; }
    fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      .then((r) => r.json())
      .then((d) => { setLines(d.lines); setSubtotal(d.subtotalMinor); })
      .catch(() => setErr("تعذّر تحميل السلة."));
  }, []);

  const postal = (f.postal ?? "").trim();
  useEffect(() => {
    if (bh || postal.length < 3) { setHits([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/places?country=${iso}&postal=${encodeURIComponent(postal)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setHits(d.postals ?? []); })
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [postal, iso, bh]);

  if (lines === null) {
    return <div className="space-y-4" aria-busy="true"><div className="skeleton h-40 rounded-3xl" /><div className="skeleton h-64 rounded-3xl" /></div>;
  }
  if (lines.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-display text-2xl font-bold">سلتك فارغة</p>
        <Link href="/shop" className="btn-dark mt-6">تابع التسوق</Link>
      </div>
    );
  }

  const discount = applied ? Math.min(applied.amountMinor, subtotal) : 0;
  const net = subtotal - discount;
  const shipping = shippingFor(c, net);
  const belowMin = subtotal < c.min_order_minor;
  const postalBad = Boolean(postal && c.postal_regex && !new RegExp(c.postal_regex).test(toWestern(postal).toUpperCase()));

  async function applyCode() {
    setCodeMsg("");
    if (!codeInput.trim()) return;
    try {
      const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: readCart(), code: codeInput }) });
      const d = await r.json();
      if (d.discountError) { setApplied(null); setCodeMsg(d.discountError); return; }
      if (d.discountCode) { setApplied({ code: d.discountCode, amountMinor: d.discountMinor }); setCodeMsg("تم تطبيق رمز الخصم."); }
    } catch { setCodeMsg("تعذّر التحقق من الرمز."); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (postalBad) { setErr("الرمز البريدي غير مطابق لصيغة الدولة المختارة."); return; }
    setErr(""); setBusy(true);
    try {
      const address: Record<string, string> = {};
      for (const k of KEYS) address[k] = f[k] ?? "";
      const r = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: readCart(), country: iso, code: applied?.code,
          customer: { name: f.name ?? "", email: f.email ?? "", phone: f.phone ?? "" }, address, notes: f.notes ?? "" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? "تعذّر إتمام الطلب. حاول مرة أخرى."); setBusy(false); return; }
      clearCart();
      router.push(`/order/${d.ref}`);
    } catch { setErr("تعذّر الاتصال بالخادم. حاول مرة أخرى."); setBusy(false); }
  }

  const L = (label: string, k: string, o: { req?: boolean; dir?: "ltr"; mode?: "numeric" | "tel" | "email" } = {}) => (
    <label className="block text-sm font-semibold">{label}{o.req ? " *" : ""}
      <input value={f[k] ?? ""} onChange={set(k)} required={o.req} dir={o.dir} inputMode={o.mode} className={input} />
    </label>
  );
  const Step = ({ n, t }: { n: string; t: string }) => (
    <h2 className="flex items-center gap-3 font-display text-2xl font-bold">
      <span className="w-8 h-8 rounded-full bg-ink text-gold grid place-items-center text-sm font-sans">{n}</span>{t}
    </h2>
  );

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_24rem] gap-8 items-start">
      <div className="space-y-6">
        <section className={card}>
          <Step n="١" t="بيانات التواصل" />
          {L("الاسم الكامل", "name", { req: true })}
          <div className="grid sm:grid-cols-2 gap-4">
            {L("رقم الهاتف", "phone", { req: true, dir: "ltr", mode: "tel" })}
            {L("البريد الإلكتروني (اختياري)", "email", { dir: "ltr", mode: "email" })}
          </div>
        </section>

        <section className={card}>
          <Step n="٢" t="عنوان التوصيل" />
          <label className="block text-sm font-semibold">الدولة *
            <select value={iso} onChange={(e) => { setIso(e.target.value); setHits([]); }} className={input}>
              {countries.map((x) => <option key={x.iso2} value={x.iso2}>{x.name_ar}</option>)}
            </select>
          </label>
          {bh ? (
            <>
              <label className="block text-sm font-semibold">المحافظة *
                <select value={f.region ?? ""} onChange={set("region")} required className={input}>
                  <option value="">اختر المحافظة</option>
                  {BH_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <PlaceInput country={iso} label="المنطقة" required value={f.area ?? ""} onChange={put("area")} className={input} />
              <div className="grid grid-cols-3 gap-3">
                {L("المجمّع", "block", { req: true, mode: "numeric" })}
                {L("الطريق", "road", { req: true, mode: "numeric" })}
                {L("المبنى", "building", { req: true })}
              </div>
              {L("رقم الشقة (إن وجد)", "apartment")}
            </>
          ) : (
            <>
              {L("المنطقة أو الولاية (اختياري)", "region")}
              <PlaceInput country={iso} label="المدينة" required value={f.city ?? ""} onChange={put("city")} className={input} />
              {L("الحي أو المنطقة (اختياري)", "area")}
              {L("الشارع", "street", { req: true })}
              <div className="grid grid-cols-2 gap-3">
                {L("رقم المبنى (اختياري)", "building")}
                {L("رقم الشقة (اختياري)", "apartment")}
              </div>
              <div>
                <label className="block text-sm font-semibold">
                  الرمز البريدي (اختياري){c.postal_hint ? ` — ${c.postal_hint}` : ""}
                  <input value={f.postal ?? ""} onChange={set("postal")} dir="ltr" inputMode="text" autoComplete="postal-code"
                    aria-invalid={postalBad} className={`${input} ${postalBad ? "!border-red-500" : ""}`} />
                </label>
                {postalBad && <p role="alert" className="mt-1 text-xs text-red-700">الرمز لا يطابق صيغة الدولة المختارة{c.postal_hint ? ` (${c.postal_hint})` : ""}.</p>}
                {hits.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2" aria-label="أماكن مطابقة للرمز البريدي">
                    {hits.map((h) => (
                      <li key={`${h.code}-${h.place_name}`}>
                        <button type="button" onClick={() => setF((p) => ({ ...p, postal: h.code, city: p.city || h.place_name }))}
                          className="rounded-full border border-gold/50 bg-pearl px-3 py-1.5 text-xs hover:bg-gold hover:text-ink transition-colors">
                          <bdi dir="ltr">{h.code}</bdi> · {h.place_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
          {L("أقرب معلم (اختياري)", "landmark")}
          <label className="block text-sm font-semibold">ملاحظات الطلب (اختياري)
            <textarea value={f.notes ?? ""} onChange={set("notes")} rows={3} maxLength={500} className={input} />
          </label>
        </section>
      </div>

      <aside className="rounded-3xl bg-ink text-pearl p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl font-bold text-gold mb-4">ملخص الطلب</h2>
        <ul className="divide-y divide-white/10 text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="py-3 flex justify-between gap-3">
              <span>{l.name}{[l.size, l.color].filter((x) => x && x !== "—").length > 0 && (
                <span className="opacity-60"> ({[l.size, l.color].filter((x) => x && x !== "—").join(" · ")})</span>)}
                {" × "}{l.qty.toLocaleString("ar")}</span>
              <span className="shrink-0">{formatBHD(l.lineMinor)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} dir="ltr" placeholder="رمز الخصم"
            className="flex-1 min-w-0 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm outline-none focus:border-gold" />
          <button type="button" onClick={applyCode} className="btn-ghost !py-2 !px-4 text-sm">تطبيق</button>
        </div>
        {codeMsg && <p className={`mt-1 text-xs ${applied ? "text-emerald-300" : "text-red-300"}`}>{codeMsg}</p>}
        <div className="mt-5 space-y-2 text-sm">
          <p className="flex justify-between"><span>المجموع الفرعي</span><span>{formatBHD(subtotal)}</span></p>
          {discount > 0 && <p className="flex justify-between text-emerald-300"><span>الخصم</span><span>−{formatBHD(discount)}</span></p>}
          <p className="flex justify-between"><span>الشحن</span><span>{shipping === 0 ? "مجاني" : formatBHD(shipping)}</span></p>
          <p className="flex justify-between font-bold text-lg border-t border-white/15 pt-3 text-gold">
            <span>الإجمالي</span><span>{formatBHD(net + shipping)}</span></p>
        </div>
        {c.eta_min_days !== null && c.eta_max_days !== null && (
          <p className="mt-3 text-sm opacity-70">مدة التوصيل المتوقعة: {c.eta_min_days.toLocaleString("ar")}–{c.eta_max_days.toLocaleString("ar")} أيام عمل</p>
        )}
        {belowMin && <p className="mt-3 text-sm text-amber-300">الحد الأدنى للطلب لهذا البلد {formatBHD(c.min_order_minor)}.</p>}
        <p className="mt-3 text-xs opacity-60">سيتم احتساب المبلغ النهائي والتحقق من التوفر عند تأكيد الطلب. الأسعار والدفع بالدينار البحريني.</p>
        {err && <p role="alert" className="mt-4 text-sm text-red-300">{err}</p>}
        <button disabled={busy || belowMin} className="btn-gold mt-5 w-full disabled:opacity-40 disabled:hover:translate-y-0">
          {busy ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
        </button>
      </aside>
    </form>
  );
}
