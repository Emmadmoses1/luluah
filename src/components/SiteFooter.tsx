import Link from "next/link";
import Logo from "./Logo";
import Newsletter from "./Newsletter";
import { safeUrl, type StoreSettings } from "@/lib/settings";

const SOCIAL: [keyof StoreSettings, string][] = [
  ["instagram", "إنستغرام"], ["x", "إكس"], ["tiktok", "تيك توك"], ["snapchat", "سناب شات"], ["facebook", "فيسبوك"],
];

export default function SiteFooter({ s, cats }: { s: StoreSettings; cats: { slug: string; name_ar: string }[] }) {
  const social = SOCIAL.map(([k, label]) => ({ label, url: safeUrl(String(s[k] ?? "")) })).filter((x) => x.url);
  const wa = s.whatsapp.replace(/\D/g, "");
  const hasContact = s.contact_email || s.contact_phone || wa || s.address_ar || s.hours_ar;
  const link = "hover:text-gold transition-colors";
  const h = "font-display text-xl font-bold text-gold mb-5";
  return (
    <footer className="mt-32 relative">
      <div className="max-w-7xl mx-auto px-4 relative z-10 -mb-16">
        <div className="rounded-3xl bg-gradient-to-br from-[#e3c88d] via-gold to-goldDeep text-ink p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center shadow-luxe">
          <div>
            <p className="text-sm tracking-[.25em] opacity-70">النشرة البريدية</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold leading-snug">اشتركي ليصلك كل جديد</h2>
            <p className="mt-2 text-sm opacity-80">أدخلي بريدك الإلكتروني وسنراسلك بالجديد من مجموعاتنا.</p>
          </div>
          <Newsletter />
        </div>
      </div>

      <div className="bg-ink text-pearl pt-28 relative overflow-hidden">
        <div className="absolute -top-24 -end-24 w-80 h-80 rounded-full border border-gold/10 spin-slow" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-5 pb-12 grid gap-12 md:grid-cols-2 lg:grid-cols-5 relative">
          <div className="lg:col-span-2">
            <Logo light size={46} />
            <p className="mt-5 text-sm leading-8 opacity-70 max-w-sm">الفخامة التي تليق بك. وجهة للأزياء والعطور والإكسسوارات بروح خليجية أنيقة.</p>
            {social.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2 text-xs">
                {social.map((x) => (
                  <li key={x.label}><a className="inline-flex items-center gap-1 border border-gold/40 rounded-full px-4 py-2 hover:bg-gold hover:text-ink transition-colors" href={x.url!} target="_blank" rel="noopener noreferrer">{x.label}<span aria-hidden>↗</span></a></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className={h}>تسوّق</h3>
            <ul className="space-y-3 text-sm">
              <li><Link className={link} href="/shop">كل المنتجات</Link></li>
              {cats.slice(0, 5).map((c) => <li key={c.slug}><Link className={link} href={`/category/${c.slug}`}>{c.name_ar}</Link></li>)}
              <li><Link className={link} href="/track">تتبّع الطلب</Link></li>
            </ul>
          </div>
          <div>
            <h3 className={h}>معلومات</h3>
            <ul className="space-y-3 text-sm">
              <li><Link className={link} href="/about">من نحن</Link></li>
              <li><Link className={link} href="/faq">الأسئلة الشائعة</Link></li>
              <li><Link className={link} href="/shipping-policy">سياسة الشحن</Link></li>
              <li><Link className={link} href="/returns">الإرجاع والاسترداد</Link></li>
              <li><Link className={link} href="/privacy">سياسة الخصوصية</Link></li>
              <li><Link className={link} href="/terms">الشروط والأحكام</Link></li>
            </ul>
          </div>
          <div>
            <h3 className={h}>تواصل معنا</h3>
            {hasContact ? (
              <ul className="space-y-3 text-sm">
                {s.contact_phone && <li dir="ltr" className="text-right">{s.contact_phone}</li>}
                {wa && <li><a className={link} href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">واتساب</a></li>}
                {s.contact_email && <li dir="ltr" className="text-right break-all">{s.contact_email}</li>}
                {s.address_ar && <li className="opacity-80">{s.address_ar}</li>}
                {s.hours_ar && <li className="opacity-80">{s.hours_ar}</li>}
              </ul>
            ) : (
              <p className="text-sm opacity-60">ستُضاف معلومات التواصل قريباً.</p>
            )}
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-4 text-xs opacity-70 relative">
            <p>© {new Date().getFullYear().toLocaleString("ar")} لؤلؤة. جميع الحقوق محفوظة.</p>
            <p className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              الدفع بالعملات الرقمية عبر مزوّد دفع خارجي
            </p>
            <p>بيانات المدن والرموز البريدية من <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer" className="underline">GeoNames</a> و© مساهمي <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
