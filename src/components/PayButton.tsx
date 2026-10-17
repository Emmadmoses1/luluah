"use client";
import { useState } from "react";

export default function PayButton({ refCode }: { refCode: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pay() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/payments/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: refCode }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) { setErr(d.error ?? "تعذّر بدء الدفع. حاول مرة أخرى."); setBusy(false); return; }
      window.location.href = d.url;
    } catch { setErr("تعذّر الاتصال بالخادم. حاول مرة أخرى."); setBusy(false); }
  }
  return (
    <div className="mt-6">
      <button type="button" onClick={pay} disabled={busy}
        className="w-full bg-ink text-gold py-3 font-bold disabled:opacity-40">
        {busy ? "جارٍ تحويلك إلى صفحة الدفع…" : "ادفع بالعملات الرقمية"}
      </button>
      <p className="mt-2 text-xs opacity-60">ستظهر لك العملات والشبكات المتاحة في صفحة الدفع الآمنة. لن نطلب منك أبداً مفتاحاً خاصاً أو عبارة استرداد.</p>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
