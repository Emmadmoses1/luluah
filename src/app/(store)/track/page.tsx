"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

export default function Track() {
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  function go(e: React.FormEvent) {
    e.preventDefault();
    let ref = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (ref.length === 14 && ref.startsWith("LU")) ref = ref.slice(2);
    if (!/^[A-Z2-9]{12}$/.test(ref)) { setErr("رقم الطلب غير صحيح. تأكد من كتابته كما ظهر لك."); return; }
    router.push(`/order/${ref}`);
  }
  return (
    <>
      <PageHeader eyebrow="متابعة" title="تتبّع طلبك" sub="أدخل رقم الطلب الذي ظهر لك بعد إتمام الشراء." />
      <main className="max-w-md mx-auto px-4 mt-10">
        <form onSubmit={go} className="rounded-3xl border border-beige bg-white/70 p-6 space-y-4">
          <label className="block text-sm font-semibold">رقم الطلب
            <input value={v} onChange={(e) => setV(e.target.value)} dir="ltr" placeholder="LU-XXXX-XXXX-XXXX" autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-beige bg-white px-4 py-3 font-mono outline-none focus:border-gold focus:ring-4 focus:ring-gold/20 transition" />
          </label>
          {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
          <button className="btn-dark w-full">عرض حالة الطلب</button>
        </form>
      </main>
    </>
  );
}
