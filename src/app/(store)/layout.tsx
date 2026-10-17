import type { Metadata } from "next";
import Link from "next/link";
import { Cairo } from "next/font/google";
import "../globals.css";
import CartLink from "@/components/CartLink";

const cairo = Cairo({ subsets: ["arabic", "latin"], display: "swap" });

export const metadata: Metadata = {
  title: "لؤلؤة | الفخامة التي تليق بك",
  description: "وجهتك للأزياء والمنتجات الفاخرة",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} bg-ivory text-ink antialiased`}>
        <div className="bg-ink text-gold text-center text-sm py-2">مرحباً بكم في لؤلؤة</div>
        <header className="border-b border-beige bg-ivory sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-3xl font-bold text-gold">لؤلؤة</Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/">الرئيسية</Link>
              <CartLink />
            </nav>
          </div>
        </header>
        {children}
        <footer className="mt-20 bg-ink text-pearl py-10 text-center text-sm">
          <p className="text-gold text-xl font-bold mb-2">لؤلؤة</p>
          <p>الفخامة التي تليق بك</p>
          <p className="mt-4 opacity-60">المنتجات المعروضة حالياً تجريبية ولا تمثّل مخزوناً حقيقياً.</p>
          <p className="mt-2 opacity-60">الصور مقدّمة من <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="underline">Pixabay</a></p>
        </footer>
      </body>
    </html>
  );
}
