import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cairo } from "next/font/google";
import "../globals.css";
import { sql } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { activeCurrencies, getDisplayCurrency } from "@/lib/currency-server";
import CartLink from "@/components/CartLink";
import Logo from "@/components/Logo";
import SearchBox from "@/components/SearchBox";
import MobileMenu from "@/components/MobileMenu";
import CurrencySelect from "@/components/CurrencySelect";
import SiteFooter from "@/components/SiteFooter";
import CookieNotice from "@/components/CookieNotice";

const cairo = Cairo({ subsets: ["arabic", "latin"], display: "swap", weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: "لؤلؤة | الفخامة التي تليق بك", template: "%s | لؤلؤة" },
  description: "لؤلؤة وجهتك للأزياء والعطور والإكسسوارات الفاخرة بروح خليجية أنيقة.",
  openGraph: { siteName: "لؤلؤة", locale: "ar_AR", type: "website" },
};
export const viewport: Viewport = { themeColor: "#0c0a09" };

async function categories() {
  try {
    return await sql<{ slug: string; name_ar: string }[]>`
      select slug, name_ar from categories where is_active order by sort_order`;
  } catch { return []; }
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [{ store }, cats, curs, cur] = await Promise.all([getSettings(), categories(), activeCurrencies(), getDisplayCurrency()]);
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} bg-ivory text-ink antialiased`}>
        <a href="#main" className="skip">انتقل إلى المحتوى</a>
        <div className="bg-ink text-gold text-center text-sm py-2 px-4">{store.announcement_ar || "مرحباً بكم في لؤلؤة"}</div>
        <header className="border-b border-beige bg-ivory/95 backdrop-blur sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
            <MobileMenu cats={cats} />
            <Link href="/" aria-label="لؤلؤة - الصفحة الرئيسية"><Logo /></Link>
            <div className="hidden md:block flex-1 max-w-xl mx-auto"><SearchBox /></div>
            <div className="flex items-center gap-4 ms-auto text-sm">
              <Link href="/track" className="hidden md:inline">تتبّع الطلب</Link>
              <CurrencySelect codes={curs.map((c) => c.code)} current={cur.code} />
              <CartLink />
            </div>
          </div>
          <div className="md:hidden px-4 pb-3"><SearchBox /></div>
          <nav aria-label="الفئات" className="hidden md:block border-t border-beige">
            <ul className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-6 text-sm overflow-x-auto whitespace-nowrap">
              <li><Link className="font-semibold" href="/shop">كل المنتجات</Link></li>
              {cats.slice(0, 9).map((c) => <li key={c.slug}><Link className="hover:text-goldDeep" href={`/category/${c.slug}`}>{c.name_ar}</Link></li>)}
            </ul>
          </nav>
        </header>
        <div id="main">{children}</div>
        <SiteFooter s={store} />
        <CookieNotice />
      </body>
    </html>
  );
}
