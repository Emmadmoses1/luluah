"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="max-w-md mx-auto px-4 mt-10">
      <h1 className="text-2xl font-bold mb-4">تتبّع طلبك</h1>
      <form onSubmit={go} className="space-y-3">
        <label className="block text-sm">رقم الطلب
          <input value={v} onChange={(e) => setV(e.target.value)} dir="ltr" placeholder="LU-XXXX-XXXX-XXXX"
            className="mt-1 w-full border border-beige bg-white px-3 py-2" /></label>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="w-full bg-ink text-gold py-3 font-bold">عرض حالة الطلب</button>
      </form>
    </main>
  );
}
