import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadInvoice } from "@/lib/mailer";
import { verifyInvoiceToken } from "@/lib/invoice-token";
import { showRef } from "@/lib/email-templates";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "فاتورة", robots: { index: false, follow: false } };

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const { ref } = await params;
  const { t } = await searchParams;
  if (!/^[A-Z2-9]{12}$/.test(ref) || typeof t !== "string" || !verifyInvoiceToken(ref, t)) notFound();
  const d = await loadInvoice(ref);
  if (!d) notFound();

  if (!d.paid) {
    return (
      <main className="max-w-xl mx-auto p-10 text-center">
        <h1 className="font-display text-3xl font-bold">الفاتورة غير متاحة بعد</h1>
        <p className="mt-3 opacity-70">تتوفر الفاتورة بعد تأكيد دفع الطلب.</p>
      </main>
    );
  }
  const s = d.seller;
  return (
    <main className="max-w-3xl mx-auto my-8 print:my-0 bg-white p-8 md:p-12 shadow-sm print:shadow-none relative overflow-hidden">
      {d.test && <p className="absolute top-1/3 inset-x-0 text-center text-7xl font-bold text-amber-500/20 -rotate-12 select-none pointer-events-none">نسخة تجريبية</p>}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-beige pb-6">
        <div>
          <p className="font-display text-5xl font-bold">لؤلؤة</p>
          <p className="mt-1 text-sm opacity-60">الفخامة التي تليق بك</p>
        </div>
        <div className="text-sm leading-7 text-end">
          <p className="text-2xl font-bold">فاتورة</p>
          <p>رقم الفاتورة: <b dir="ltr">{d.invoiceNo}</b></p>
          <p>رقم الطلب: <b dir="ltr">{showRef(d.ref)}</b></p>
          <p>التاريخ: {d.date}</p>
        </div>
      </header>

      <section className="grid sm:grid-cols-2 gap-6 mt-6 text-sm leading-7">
        <div>
          <p className="font-bold">فاتورة إلى</p>
          <p>{d.name}</p><p>{d.countryAr}</p>
        </div>
        {(s.name || s.address || s.phone || s.email || s.tax) && (
          <div>
            <p className="font-bold">من</p>
            {s.name && <p>{s.name}</p>}{s.address && <p>{s.address}</p>}
            {s.phone && <p dir="ltr" className="text-end">{s.phone}</p>}{s.email && <p dir="ltr" className="text-end">{s.email}</p>}
            {s.tax && <p>الرقم الضريبي: <span dir="ltr">{s.tax}</span></p>}
          </div>
        )}
      </section>

      <table className="w-full mt-8 text-sm">
        <thead><tr className="bg-pearl text-start"><th className="p-3 text-start">المنتج</th><th className="p-3">الكمية</th><th className="p-3">السعر</th><th className="p-3 text-end">المبلغ</th></tr></thead>
        <tbody>
          {d.items.map((i, n) => (
            <tr key={n} className="border-b border-beige">
              <td className="p-3">{i.name}{i.variant && <span className="block text-xs opacity-60">{i.variant}</span>}</td>
              <td className="p-3 text-center">{i.qty.toLocaleString("ar")}</td>
              <td className="p-3 text-center" dir="ltr">{i.unit}</td>
              <td className="p-3 text-end" dir="ltr">{i.line}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-6 ms-auto max-w-xs text-sm space-y-1">
        <div className="flex justify-between"><dt>المجموع الفرعي</dt><dd dir="ltr">{d.subtotal}</dd></div>
        {d.discount && <div className="flex justify-between"><dt>الخصم</dt><dd dir="ltr">-{d.discount}</dd></div>}
        <div className="flex justify-between"><dt>الشحن</dt><dd dir="ltr">{d.shipping}</dd></div>
        <div className="flex justify-between text-lg font-bold border-t border-ink pt-2"><dt>الإجمالي</dt><dd dir="ltr">{d.total}</dd></div>
      </dl>
      <p className="mt-6 text-xs opacity-60">جميع المبالغ بالدينار البحريني. حالة الدفع: مدفوعة.</p>
      <div className="mt-8 text-center"><PrintButton /></div>
    </main>
  );
}
