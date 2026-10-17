import Link from "next/link";
import Logo from "./Logo";
import Newsletter from "./Newsletter";
import { safeUrl, type StoreSettings } from "@/lib/settings";

const SOCIAL: [keyof StoreSettings, string][] = [
  ["instagram", "إنستغرام"], ["x", "إكس"], ["tiktok", "تيك توك"], ["snapchat", "سناب شات"], ["facebook", "فيسبوك"],
];

export default function SiteFooter({ s }: { s: StoreSettings }) {
  const social = SOCIAL.map(([k, label]) => ({ label, url: safeUrl(String(s[k] ?? "")) })).filter((x) => x.url);
  const wa = s.whatsapp.replace(/\D/g, "");
  const hasContact = s.contact_email || s.contact_phone || wa || s.address_ar;
  const link = "hover:text-gold transition-colors";
  return (
    <footer className="mt-24 bg-ink text-pearl">
      <div className="max-w-6xl mx-auto px-4 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo light />
          <p className="mt-4 text-sm leading-7 opacity-70">الفخامة التي تليق بك. وجهة للأزياء والعطور والإكسسوارات بروح خليجية أنيقة.</p>
        </div>
        <div>
          <h3 className="font-bold text-gold mb-3">تسوّق</h3>
          <ul className="space-y-2 text-sm">
            <li><Link className={link} href="/shop">كل المنتجات</Link></li>
            <li><Link className={link} href="/track">تتبّع الطلب</Link></li>
            <li><Link className={link} href="/cart">سلة التسوق</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-gold mb-3">معلومات</h3>
          <ul className="space-y-2 text-sm">
            <li><Link className={link} href="/about">من نحن</Link></li>
            <li><Link className={link} href="/faq">الأسئلة الشائعة</Link></li>
            <li><Link className={link} href="/shipping-policy">سياسة الشحن</Link></li>
            <li><Link className={link} href="/returns">الإرجاع والاسترداد</Link></li>
            <li><Link className={link} href="/privacy">سياسة الخصوصية</Link></li>
            <li><Link className={link} href="/terms">الشروط والأحكام</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-gold mb-3">تواصل معنا</h3>
          {hasContact ? (
            <ul className="space-y-2 text-sm">
              {s.contact_phone && <li dir="ltr" className="text-right">{s.contact_phone}</li>}
              {wa && <li><a className={link} href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">واتساب</a></li>}
              {s.contact_email && <li dir="ltr" className="text-right break-all">{s.contact_email}</li>}
              {s.address_ar && <li>{s.address_ar}</li>}
            </ul>
          ) : (
            <p className="text-sm opacity-60">ستُضاف معلومات التواصل قريباً.</p>
          )}
          {social.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-4 text-sm">
              {social.map((x) => (
                <li key={x.label}><a className={link} href={x.url!} target="_blank" rel="noopener noreferrer">{x.label}</a></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-6">
          <Newsletter />
          <div className="text-xs opacity-60 space-y-1 leading-6">
            {s.show_demo_notice && <p>المنتجات المعروضة حالياً تجريبية ولا تمثّل مخزوناً حقيقياً.</p>}
            <p>الصور مقدّمة من <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="underline">Pixabay</a></p>
            <p>© لؤلؤة. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
