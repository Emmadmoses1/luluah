"use client";
import { useState } from "react";

const input = "mt-1 w-full border border-beige bg-white px-3 py-2 text-sm";

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
    <details className="mt-6 border border-beige">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">اكتب تقييماً</summary>
      <form onSubmit={go} className="p-4 space-y-3">
        <p className="text-xs opacity-70">يمكن التقييم فقط لمن استلم المنتج. أدخل رقم طلبك لتأكيد الشراء.</p>
        <label className="block text-sm">رقم الطلب
          <input value={f.ref} onChange={set("ref")} dir="ltr" placeholder="LU-XXXX-XXXX-XXXX" required className={input} /></label>
        <label className="block text-sm">الاسم
          <input value={f.name} onChange={set("name")} required minLength={2} maxLength={60} className={input} /></label>
        <label className="block text-sm">التقييم
          <select value={f.rating} onChange={set("rating")} className={input}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
          </select></label>
        <label className="block text-sm">رأيك
          <textarea value={f.body} onChange={set("body")} rows={3} maxLength={1000} className={input} /></label>
        {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.t}</p>}
        <button disabled={busy} className="bg-ink text-gold px-6 py-2 text-sm font-semibold disabled:opacity-50">إرسال التقييم</button>
      </form>
    </details>
  );
}
