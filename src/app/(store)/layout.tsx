import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cairo, Amiri } from "next/font/google";
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
import StickyHeader from "@/components/StickyHeader";
import FloatingActions from "@/components/FloatingActions";
import { getWalletSettings } from "@/lib/wallet";

const cairo = Cairo({ subsets: ["arabic", "latin"], display: "swap", weight: ["300", "400", "600", "700", "800"], variable: "--font-body" });
const amiri = Amiri({ subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"], variable: "--font-display" });

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
  const [{ store }, cats, curs, cur, wallet] = await Promise.all([getSettings(), categories(), activeCurrencies(), getDisplayCurrency(), getWalletSettings()]);
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${amiri.variable} font-[family-name:var(--font-body)] bg-ivory text-ink antialiased`}>
        <a href="#main" className="skip">انتقل إلى المحتوى</a>
        <div className="bg-ink text-gold text-center text-[13px] py-2.5 px-4 tracking-wide">{store.announcement_ar || "مرحباً بكم في لؤلؤة"}</div>
        <StickyHeader>
          <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center gap-4">
            <MobileMenu cats={cats} />
            <Link href="/" aria-label="لؤلؤة - الصفحة الرئيسية" className="shrink-0"><Logo size={40} /></Link>
            <nav aria-label="الفئات" className="hidden lg:flex items-center gap-7 text-sm ms-8">
              <Link className="u-link font-bold" href="/shop">كل المنتجات</Link>
              {cats.slice(0, 5).map((c) => <Link key={c.slug} className="u-link hover:text-goldDeep transition-colors" href={`/category/${c.slug}`}>{c.name_ar}</Link>)}
            </nav>
            <div className="hidden md:block flex-1 max-w-md ms-auto"><SearchBox /></div>
            <div className="flex items-center gap-1 ms-auto md:ms-0 text-sm">
              <Link href="/track" className="hidden xl:inline u-link px-2">تتبّع الطلب</Link>
              <CurrencySelect codes={curs.map((c) => c.code)} current={cur.code} />
              {wallet.enabled && (
                <Link href="/account" aria-label="حسابي" className="p-2 hover:text-goldDeep transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
                </Link>
              )}
              <CartLink />
            </div>
          </div>
          <div className="md:hidden px-4 pb-3"><SearchBox /></div>
        </StickyHeader>
        <div id="main">{children}</div>
        <SiteFooter s={store} cats={cats} />
        <FloatingActions whatsapp={store.whatsapp} />
        <CookieNotice />
      </body>
    </html>
  );
}
