"use client";
import { useActionState, useEffect, useState } from "react";
import { createDeposit } from "@/app/(store)/account/actions";
import { convertAmount, formatUnit, type Unit } from "@/lib/converter";

const CHIPS = [10, 25, 50, 100, 250];
const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace("٫", ".").replace(/,/g, ".");
const card = "rounded-3xl border border-beige bg-white/70 p-5 md:p-7 space-y-4";
const inp = "w-full rounded-xl border border-beige bg-white px-4 py-3 outline-none focus:border-gold focus:ring-4 focus:ring-gold/20 transition";

export default function DepositForm({ minBhd, maxBhd, cardEnabled }: { minBhd: number; maxBhd: number; cardEnabled: boolean }) {
  const [state, run, pending] = useActionState(createDeposit, undefined);
  const [units, setUnits] = useState<Unit[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [cryptoLive, setCryptoLive] = useState(true);
  const [failed, setFailed] = useState(false);
  const [amount, setAmount] = useState("");
  const [convAmount, setConvAmount] = useState("");
  const [convFrom, setConvFrom] = useState("USDT");
  const [method, setMethod] = useState<"crypto" | "card">("crypto");

  useEffect(() => {
    let dead = false;
    const load = () => fetch("/api/rates/convert").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (dead) return;
      if (d && Array.isArray(d.units)) { setUnits(d.units); setUpdated(d.updated); setCryptoLive(Boolean(d.cryptoLive)); setFailed(false); } else setFailed(true);
    }).catch(() => { if (!dead) setFailed(true); });
    load();
    const t = setInterval(load, 45_000);
    return () => { dead = true; clearInterval(t); };
  }, []);

  const bhd = Number(digits(amount));
  const hasAmount = Number.isFinite(bhd) && bhd > 0;
  const shown = units.filter((u) => u.code !== "BHD");
  const conv = Number(digits(convAmount));
  const convBhd = Number.isFinite(conv) && conv > 0 ? convertAmount(conv, convFrom, "BHD", units) : null;

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <form action={run} className={card}>
        <h2 className="font-display text-2xl font-bold">إيداع رصيد</h2>
        <label className="block text-sm font-semibold">المبلغ بالدينار البحريني
          <input name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" dir="ltr" placeholder="25.000" required className={`${inp} mt-1.5`} />
        </label>
        <div className="flex flex-wrap gap-2">
          {CHIPS.filter((c) => c >= minBhd && c <= maxBhd).map((c) => (
            <button key={c} type="button" onClick={() => setAmount(c.toFixed(3))} className="rounded-full border border-beige bg-white px-4 py-1.5 text-sm hover:border-gold">{c.toLocaleString("ar")} د.ب</button>
          ))}
        </div>
        <p className="text-xs opacity-60">الحد الأدنى {minBhd.toLocaleString("ar")} د.ب والحد الأقصى {maxBhd.toLocaleString("ar")} د.ب للعملية الواحدة.</p>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold mb-1">طريقة الدفع</legend>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="method" value="crypto" checked={method === "crypto"} onChange={() => setMethod("crypto")} className="accent-[#a8864a]" /> عملات رقمية (تُضاف تلقائياً عند وصول الدفعة)</label>
          {cardEnabled && <label className="flex items-center gap-2 text-sm"><input type="radio" name="method" value="card" checked={method === "card"} onChange={() => setMethod("card")} className="accent-[#a8864a]" /> بطاقة (تُحوَّل عبر مزوّد خارجي إلى عملة رقمية)</label>}
        </fieldset>
        {method === "card" && <p className="text-xs leading-6 opacity-70">الدفع بالبطاقة يتم عند مزوّد خارجي قد يطلب التحقق من هويتك ويخصم رسومه، وقد يصل أقل من المطلوب بسبب الرسوم. لا نرى بيانات بطاقتك.</p>}

        {state?.error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm">{state.error}</p>}
        <button disabled={pending} className="btn-gold w-full disabled:opacity-60">{pending ? "جارٍ إنشاء العملية…" : "متابعة الإيداع"}</button>
        <p className="text-xs opacity-60 leading-6">سيُضاف المبلغ إلى رصيدك بعد وصول الدفعة وتأكيدها فعلياً. الرصيد للشراء من المتجر فقط.</p>
      </form>

      <section className={card} aria-label="محوّل الأسعار الحي">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">كم أدفع؟</h2>
          <span className="text-xs opacity-60">{failed ? "تعذّر تحديث الأسعار" : updated ? `آخر تحديث ${new Date(updated).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}` : "جارٍ التحميل…"}</span>
        </div>
        {!hasAmount ? <p className="text-sm opacity-70">اكتب المبلغ الذي تريد إيداعه ليظهر ما يعادله بكل عملة.</p> : units.length === 0 ? <p className="text-sm opacity-70">جارٍ تحميل الأسعار…</p> : (
          <ul className="divide-y divide-beige text-sm">
            {shown.map((u) => {
              const v = convertAmount(bhd, "BHD", u.code, units);
              return v === null ? null : <li key={u.code} className="py-2 flex justify-between"><span>{u.code}</span><span dir="ltr" className="font-mono">{formatUnit(v, u)}</span></li>;
            })}
          </ul>
        )}
        {!cryptoLive && units.length > 0 && <p className="text-xs text-amber-700">أسعار العملات الرقمية قد لا تكون محدّثة الآن.</p>}
        <p className="text-xs opacity-60 leading-6">الأسعار تقديرية. المبلغ النهائي بالعملة الرقمية يُثبَّت عند إنشاء عملية الإيداع وتراه في صفحة الدفع. أسعار العملات الرقمية من <a className="underline" href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer">CoinGecko</a>.</p>

        <div className="border-t border-beige pt-4 space-y-3">
          <h3 className="font-bold text-sm">لديّ مبلغ بعملة أخرى</h3>
          <div className="flex gap-2">
            <input value={convAmount} onChange={(e) => setConvAmount(e.target.value)} inputMode="decimal" dir="ltr" placeholder="50" className={inp} aria-label="المبلغ" />
            <select value={convFrom} onChange={(e) => setConvFrom(e.target.value)} className={`${inp} !w-32`} aria-label="العملة">
              {units.filter((u) => u.code !== "BHD").map((u) => <option key={u.code} value={u.code}>{u.code}</option>)}
            </select>
          </div>
          {convBhd !== null && (
            <p className="text-sm">يعادل ≈ <b dir="ltr">{convBhd.toFixed(3)}</b> د.ب{" "}
              <button type="button" className="underline font-bold" onClick={() => setAmount((Math.floor(convBhd * 1000) / 1000).toFixed(3))}>استخدم هذا المبلغ</button></p>
          )}
        </div>
      </section>
    </div>
  );
}
