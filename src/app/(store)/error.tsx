"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, path: location.pathname });
      navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }));
    } catch { /* reporting must never break the page */ }
  }, [error]);
  return (
    <main className="hero-bg grain relative overflow-hidden text-pearl text-center py-28 px-5">
      <div className="hero-in relative">
        <p className="font-display text-6xl font-bold gold-text">عذراً</p>
        <h1 className="mt-4 font-display text-3xl font-bold">حدث خطأ غير متوقع</h1>
        <p className="mt-3 opacity-75">لم نتمكن من عرض هذه الصفحة. حاول مرة أخرى، وإن استمرت المشكلة فتواصل معنا.</p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button type="button" onClick={reset} className="btn-gold">إعادة المحاولة</button>
          <Link href="/" className="btn-ghost">العودة للرئيسية</Link>
        </div>
      </div>
    </main>
  );
}
