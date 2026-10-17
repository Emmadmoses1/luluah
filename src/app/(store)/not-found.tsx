import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hero-bg grain relative overflow-hidden text-pearl text-center py-28 px-5">
      <div className="hero-in relative">
        <p className="font-display text-8xl font-bold gold-text">٤٠٤</p>
        <h1 className="mt-4 font-display text-3xl font-bold">الصفحة غير موجودة</h1>
        <p className="mt-3 opacity-75">ربما تغيّر الرابط أو لم تعد الصفحة متاحة.</p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link href="/" className="btn-gold">العودة للرئيسية</Link>
          <Link href="/shop" className="btn-ghost">تصفّح المنتجات</Link>
        </div>
      </div>
    </main>
  );
}
