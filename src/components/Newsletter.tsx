"use client";
import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setState("busy"); setMsg("");
    try {
      const r = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setState("ok"); setMsg("شكراً لاشتراكك."); setEmail(""); }
      else { setState("err"); setMsg(d.error ?? "تعذّر الاشتراك. حاول مرة أخرى."); }
    } catch { setState("err"); setMsg("تعذّر الاتصال بالخادم."); }
  }
  return (
    <form onSubmit={go} className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="nl-email">البريد الإلكتروني</label>
        <input id="nl-email" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email"
          className="flex-1 min-w-0 rounded-full bg-white px-5 py-3 text-ink outline-none focus:ring-4 focus:ring-ink/20 placeholder:text-ink/40" />
        <button disabled={state === "busy"} className="btn-dark disabled:opacity-60">{state === "busy" ? "جارٍ الإرسال…" : "اشتراك"}</button>
      </div>
      {msg && <p role="status" className={`mt-2 text-sm ${state === "ok" ? "text-ink" : "text-red-900"}`}>{msg}</p>}
    </form>
  );
}
