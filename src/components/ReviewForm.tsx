"use client";
import { useState } from "react";

const input = "mt-1.5 w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-4 focus:ring-gold/20 transition";

export default function ReviewForm({ slug }: { slug: string }) {
  const [f, setF] = useState({ ref: "", name: "", rating: "5", body: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ref: f.ref, name: f.name, rating: Number(f.rating), body: f.body }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setMsg({ ok: true, t: "شكراً لك. سيظهر تقييمك بعد مراجعته." }); setF({ ref: "", name: "", rating: "5", body: "" }); }
      else setMsg({ ok: false, t: d.error ?? "تعذّر إرسال التقييم." });
    } catch { setMsg({ ok: false, t: "تعذّر الاتصال بالخادم." }); }
    setBusy(false);
  }
  return (
    <details className="group mt-6 rounded-2xl border border-beige bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold flex items-center justify-between">
        اكتب تقييماً<span className="text-gold text-xl transition-transform group-open:rotate-45">+</span>
      </summary>
      <form onSubmit={go} className="px-5 pb-5 space-y-3">
        <p className="text-xs opacity-70 leading-6">يمكن التقييم فقط لمن استلم المنتج. أدخل رقم طلبك لتأكيد الشراء.</p>
        <label className="block text-sm font-semibold">رقم الطلب
          <input value={f.ref} onChange={set("ref")} dir="ltr" placeholder="LU-XXXX-XXXX-XXXX" required className={input} /></label>
        <label className="block text-sm font-semibold">الاسم
          <input value={f.name} onChange={set("name")} required minLength={2} maxLength={60} className={input} /></label>
        <label className="block text-sm font-semibold">التقييم
          <select value={f.rating} onChange={set("rating")} className={input}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
          </select></label>
        <label className="block text-sm font-semibold">رأيك
          <textarea value={f.body} onChange={set("body")} rows={3} maxLength={1000} className={input} /></label>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.t}</p>}
        <button disabled={busy} className="btn-dark !py-2.5 text-sm disabled:opacity-50">إرسال التقييم</button>
      </form>
    </details>
  );
}
