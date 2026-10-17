"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearCart, readCart } from "@/lib/cart";
import { formatBHD } from "@/lib/money";
import { BH_REGIONS, shippingFor } from "@/lib/shipping";

export type CountryOpt = {
  iso2: string; name_ar: string; dial_code: string; fee_minor: number; free_over_minor: number | null;
  min_order_minor: number; eta_min_days: number | null; eta_max_days: number | null;
};
type Line = { variantId: string; name: string; size: string | null; color: string | null;
  unitMinor: number; qty: number; lineMinor: number; available: boolean };

const KEYS = ["region", "city", "area", "block", "road", "street", "building", "apartment", "postal", "landmark"];
const input = "mt-1 w-full border border-beige bg-white px-3 py-2";

export default function CheckoutForm({ countries }: { countries: CountryOpt[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [iso, setIso] = useState(countries.find((c) => c.iso2 === "BH")?.iso2 ?? countries[0].iso2);
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const c = countries.find((x) => x.iso2 === iso)!;
  const bh = iso === "BH";
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const items = readCart();
    if (items.length === 0) { setLines([]); return; }
    fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      .then((r) => r.json())
      .then((d) => { setLines(d.lines); setSubtotal(d.subtotalMinor); })
      .catch(() => setErr("تعذّر تحميل السلة."));
  }, []);

  if (lines === null) return <p>جارٍ التحميل…</p>;
  if (lines.length === 0) {
    return <div className="text-center"><p>سلتك فارغة.</p><Link href="/" className="inline-block mt-4 bg-ink text-gold px-6 py-3">تابع التسوق</Link></div>;
  }

  const shipping = shippingFor(c, subtotal);
  const belowMin = subtotal < c.min_order_minor;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const address: Record<string, string> = {};
      for (const k of KEYS) address[k] = f[k] ?? "";
      const r = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: readCart(), country: iso,
          customer: { name: f.name ?? "", email: f.email ?? "", phone: f.phone ?? "" }, address, notes: f.notes ?? "" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? "تعذّر إتمام الطلب. حاول مرة أخرى."); setBusy(false); return; }
      clearCart();
      router.push(`/order/${d.ref}`);
    } catch { setErr("تعذّر الاتصال بالخادم. حاول مرة أخرى."); setBusy(false); }
  }

  const L = (label: string, k: string, o: { req?: boolean; dir?: "ltr"; mode?: "numeric" | "tel" | "email" } = {}) => (
    <label className="block text-sm">{label}{o.req ? " *" : ""}
      <input value={f[k] ?? ""} onChange={set(k)} required={o.req} dir={o.dir} inputMode={o.mode} className={input} />
    </label>
  );

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h2 className="text-lg font-bold">بيانات التواصل</h2>
        {L("الاسم الكامل", "name", { req: true })}
        {L("رقم الهاتف", "phone", { req: true, dir: "ltr", mode: "tel" })}
        {L("البريد الإلكتروني (اختياري)", "email", { dir: "ltr", mode: "email" })}
        <h2 className="text-lg font-bold pt-2">عنوان التوصيل</h2>
        <label className="block text-sm">الدولة *
          <select value={iso} onChange={(e) => setIso(e.target.value)} className={input}>
            {countries.map((x) => <option key={x.iso2} value={x.iso2}>{x.name_ar}</option>)}
          </select>
        </label>
        {bh ? (
          <>
            <label className="block text-sm">المحافظة *
              <select value={f.region ?? ""} onChange={set("region")} required className={input}>
                <option value="">اختر المحافظة</option>
                {BH_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            {L("المنطقة", "area", { req: true })}
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
            {L("المدينة", "city", { req: true })}
            {L("الحي أو المنطقة (اختياري)", "area")}
            {L("الشارع", "street", { req: true })}
            <div className="grid grid-cols-2 gap-3">
              {L("رقم المبنى (اختياري)", "building")}
              {L("رقم الشقة (اختياري)", "apartment")}
            </div>
            {L("الرمز البريدي (اختياري)", "postal", { dir: "ltr" })}
          </>
        )}
        {L("أقرب معلم (اختياري)", "landmark")}
        <label className="block text-sm">ملاحظات الطلب (اختياري)
          <textarea value={f.notes ?? ""} onChange={set("notes")} rows={3} maxLength={500} className={input} />
        </label>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4">ملخص الطلب</h2>
        <ul className="divide-y divide-beige text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="py-3 flex justify-between gap-3">
              <span>{l.name}{[l.size, l.color].filter((x) => x && x !== "—").length > 0 && (
                <span className="opacity-60"> ({[l.size, l.color].filter((x) => x && x !== "—").join(" · ")})</span>)}
                {" × "}{l.qty.toLocaleString("ar")}</span>
              <span>{formatBHD(l.lineMinor)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 text-sm">
          <p className="flex justify-between"><span>المجموع الفرعي</span><span>{formatBHD(subtotal)}</span></p>
          <p className="flex justify-between"><span>الشحن</span><span>{shipping === 0 ? "مجاني" : formatBHD(shipping)}</span></p>
          <p className="flex justify-between font-bold text-base border-t border-beige pt-2">
            <span>الإجمالي</span><span>{formatBHD(subtotal + shipping)}</span></p>
        </div>
        {c.eta_min_days !== null && c.eta_max_days !== null && (
          <p className="mt-3 text-sm opacity-70">مدة التوصيل المتوقعة: {c.eta_min_days.toLocaleString("ar")}–{c.eta_max_days.toLocaleString("ar")} أيام عمل</p>
        )}
        {belowMin && <p className="mt-3 text-sm text-amber-700">الحد الأدنى للطلب لهذا البلد {formatBHD(c.min_order_minor)}.</p>}
        <p className="mt-3 text-xs opacity-60">سيتم احتساب المبلغ النهائي والتحقق من التوفر عند تأكيد الطلب.</p>
        {err && <p className="mt-4 text-sm text-red-700">{err}</p>}
        <button disabled={busy || belowMin} className="mt-5 w-full bg-ink text-gold py-3 font-bold disabled:opacity-40">
          {busy ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
        </button>
      </div>
    </form>
  );
}
