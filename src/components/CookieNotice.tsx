"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "luluah_cookie_ok";

export default function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem(KEY)) setShow(true); } catch { setShow(true); } }, []);
  if (!show) return null;
  return (
    <div role="dialog" aria-label="إشعار الخصوصية" className="fixed bottom-0 inset-x-0 z-40 bg-ink text-pearl text-sm p-4">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <p className="leading-7">نحفظ سلتك وتفضيل العملة على جهازك فقط لتسهيل التسوق، ولا نستخدم ملفات تتبّع إعلانية. <Link href="/privacy" className="underline">سياسة الخصوصية</Link></p>
        <button type="button" className="bg-gold text-ink px-5 py-2 font-semibold"
          onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} setShow(false); }}>حسناً</button>
      </div>
    </div>
  );
}
