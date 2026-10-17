"use client";
import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setMsg({ ok: true, t: "شكراً لاشتراكك في نشرتنا." }); setEmail(""); }
      else setMsg({ ok: false, t: d.error ?? "تعذّر الاشتراك. حاول مرة أخرى." });
    } catch { setMsg({ ok: false, t: "تعذّر الاتصال بالخادم." }); }
    setBusy(false);
  }
  return (
    <form onSubmit={go} className="w-full max-w-md">
      <label className="block text-sm mb-2" htmlFor="nl">اشترك لتصلك أحدث الإصدارات والعروض</label>
      <div className="flex">
        <input id="nl" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني" className="flex-1 min-w-0 px-4 py-2 text-sm text-ink bg-white" />
        <button disabled={busy} className="bg-gold text-ink px-5 text-sm font-semibold disabled:opacity-50">اشتراك</button>
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-green-400" : "text-red-300"}`}>{msg.t}</p>}
    </form>
  );
}
