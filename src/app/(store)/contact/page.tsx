import type { Metadata } from "next";
import { getSettings, safeUrl, type StoreSettings } from "@/lib/settings";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "طرق التواصل مع فريق لؤلؤة.",
  alternates: { canonical: "/contact" },
};

const SOCIAL: [keyof StoreSettings, string][] = [
  ["instagram", "إنستغرام"], ["x", "إكس"], ["tiktok", "تيك توك"], ["snapchat", "سناب شات"], ["facebook", "فيسبوك"],
];

export default async function Contact() {
  const { store: s } = await getSettings();
  const wa = s.whatsapp.replace(/\D/g, "");
  const items: [string, React.ReactNode][] = [];
  if (s.contact_phone) items.push(["الهاتف", <span key="p" dir="ltr">{s.contact_phone}</span>]);
  if (wa) items.push(["واتساب", <a key="w" className="u-link" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">ابدئي المحادثة</a>]);
  if (s.contact_email) items.push(["البريد الإلكتروني", <span key="e" dir="ltr" className="break-all">{s.contact_email}</span>]);
  if (s.address_ar) items.push(["العنوان", s.address_ar]);
  if (s.hours_ar) items.push(["ساعات العمل", s.hours_ar]);
  const social = SOCIAL.map(([k, label]) => ({ label, url: safeUrl(String(s[k] ?? "")) })).filter((x) => x.url);

  return (
    <>
      <PageHeader eyebrow="يسعدنا سماعك" title="تواصل معنا" sub="نسعد بمساعدتك في أي استفسار عن الطلبات والمنتجات." />
      <main className="max-w-3xl mx-auto px-5 mt-12">
        {items.length === 0 && social.length === 0 ? (
          <Reveal><p className="rounded-2xl border border-beige bg-white p-8 text-center leading-8">ستُضاف معلومات التواصل قريباً.</p></Reveal>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map(([label, value], i) => (
              <Reveal key={label} delay={i * 70}>
                <div className="h-full rounded-2xl border border-beige bg-white p-6 hover:shadow-luxe hover:-translate-y-1 transition-all duration-300">
                  <p className="text-xs text-goldDeep tracking-widest">{label}</p>
                  <p className="mt-2 font-semibold leading-8">{value}</p>
                </div>
              </Reveal>
            ))}
          </div>
        )}
        {social.length > 0 && (
          <Reveal>
            <ul className="mt-8 flex flex-wrap gap-3 justify-center">
              {social.map((x) => (
                <li key={x.label}><a className="btn-dark !py-2 !px-5 text-sm" href={x.url!} target="_blank" rel="noopener noreferrer">{x.label}</a></li>
              ))}
            </ul>
          </Reveal>
        )}
      </main>
    </>
  );
}
