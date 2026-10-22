import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { formatBHD } from "@/lib/money";
import { getSettings, paymentsConfigured } from "@/lib/settings";
import PayButton from "@/components/PayButton";
import AutoRefresh from "@/components/AutoRefresh";
import { invoiceToken } from "@/lib/invoice-token";

export const dynamic = "force-dynamic";

const FULFILL: Record<string, string> = { new: "قيد المراجعة", processing: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي" };
const PAY: Record<string, string> = { unpaid: "بانتظار الدفع", pending: "بانتظار الدفع", confirming: "قيد التأكيد", paid: "مدفوع",
  partially_paid: "مدفوع جزئياً", failed: "فشلت العملية", expired: "انتهت المهلة", refunded: "مستردّ" };
const PAY_TONE: Record<string, string> = { paid: "bg-emerald-100 text-emerald-800", confirming: "bg-amber-100 text-amber-800",
  unpaid: "bg-neutral-100 text-neutral-700", pending: "bg-neutral-100 text-neutral-700", partially_paid: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800", expired: "bg-red-100 text-red-800", refunded: "bg-purple-100 text-purple-800" };
const STEPS = ["new", "processing", "shipped", "delivered"];

export default async function OrderPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!/^[A-Z2-9]{12}$/.test(ref)) notFound();
  // Only non-identifying details are shown: no address, phone, or email.
  const [o] = await sql<{ id: string; fulfillment_status: string; payment_status: string; is_test: boolean;
    subtotal_minor: string; discount_minor: string; shipping_minor: string; total_minor: string; country_ar: string;
    tracking_ref: string | null; created_at: Date }[]>`
    select o.id, o.fulfillment_status, o.payment_status, o.is_test, o.subtotal_minor, o.discount_minor, o.shipping_minor,
           o.total_minor, c.name_ar as country_ar, o.tracking_ref, o.created_at
    from orders o join countries c on c.iso2 = o.country_iso2 where o.ref = ${ref}`;
  if (!o) notFound();
  const items = await sql<{ product_name: string; variant_label: string | null; qty: number; line_minor: string }[]>`
    select product_name, variant_label, qty, line_minor from order_items where order_id = ${o.id}`;
  const { payments } = await getSettings();
  const shown = `LU-${ref.slice(0, 4)}-${ref.slice(4, 8)}-${ref.slice(8)}`;
  const awaiting = o.payment_status === "unpaid" || o.payment_status === "pending";
  const cancelled = o.fulfillment_status === "cancelled";
  const canPay = awaiting && !cancelled && payments.crypto_enabled && paymentsConfigured();
  const live = awaiting || o.payment_status === "confirming";
  const idx = STEPS.indexOf(o.fulfillment_status);
  const note = "mt-4 rounded-2xl p-4 text-sm leading-7";

  return (
    <main className="max-w-2xl mx-auto px-4 mt-10">
      {live && !cancelled && <AutoRefresh />}
      <div className="text-center">
        <span className="mx-auto w-14 h-14 rounded-full pearl-orb grid place-items-center text-ink text-xl font-bold">✓</span>
        <h1 className="mt-4 font-display text-4xl font-bold">شكراً لطلبك</h1>
        <p className="mt-3">رقم الطلب: <span dir="ltr" className="font-mono font-bold bg-pearl rounded-full px-3 py-1">{shown}</span></p>
        <p className="mt-2 text-sm opacity-60">احتفظ بهذا الرقم لمتابعة طلبك.</p>
      </div>
      {o.is_test && <p className={`${note} bg-amber-100 text-amber-900`}>هذا طلب تجريبي ولن يتم تجهيزه أو شحنه.</p>}

      <div className="mt-8 rounded-3xl border border-beige bg-white/70 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="font-bold">حالة الدفع</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${PAY_TONE[o.payment_status] ?? "bg-neutral-100"}`}>{PAY[o.payment_status] ?? o.payment_status}</span>
        </div>
        {cancelled ? (
          <p className="mt-5 rounded-2xl bg-red-50 text-red-800 p-4 text-sm font-bold text-center">تم إلغاء هذا الطلب</p>
        ) : (
          <ol className="mt-6 flex items-start" aria-label="مراحل الطلب">
            {STEPS.map((s, i) => (
              <li key={s} className="relative flex-1 flex flex-col items-center text-center">
                {i > 0 && <span aria-hidden className={`absolute top-3.5 -start-1/2 w-full h-0.5 ${i <= idx ? "bg-gold" : "bg-beige"}`} />}
                <span className={`relative z-10 w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${i <= idx ? "bg-gold text-ink" : "bg-beige text-ink/50"}`}
                  aria-current={i === idx ? "step" : undefined}>{i < idx ? "✓" : (i + 1).toLocaleString("ar")}</span>
                <span className={`mt-2 text-xs ${i === idx ? "font-bold" : "opacity-60"}`}>{FULFILL[s]}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {canPay && <PayButton refCode={ref} />}
      {awaiting && !cancelled && !canPay && (
        <p className={`${note} bg-pearl`}>تم تسجيل طلبك. الدفع بالعملات الرقمية غير متاح حالياً، وسنتواصل معك لإتمام الدفع. ولن يُعتبر الطلب مدفوعاً إلا بعد تأكيد الدفع فعلياً.</p>
      )}
      {o.payment_status === "confirming" && <p className={`${note} bg-pearl`}>استلمنا دفعتك وهي قيد التأكيد على الشبكة. ستتحدّث هذه الصفحة تلقائياً.</p>}
      {o.payment_status === "partially_paid" && <p className={`${note} bg-orange-50 text-amber-900`}>المبلغ المدفوع أقل من المطلوب. يرجى التواصل معنا لإكمال الدفع.</p>}
      {cancelled && <p className={`${note} bg-pearl`}>إن كنت قد دفعت، يرجى التواصل معنا.</p>}
      {payments.instructions_ar && awaiting && <p className={`${note} bg-pearl whitespace-pre-line`}>{payments.instructions_ar}</p>}
      {o.tracking_ref && <p className="mt-4 text-sm">رقم التتبع: <span dir="ltr" className="font-mono">{o.tracking_ref}</span></p>}
      {o.payment_status === "paid" && <p className="mt-4"><a href={`/invoice/${ref}?t=${invoiceToken(ref)}`} className="btn-dark">عرض الفاتورة وطباعتها</a></p>}

      <section className="mt-8 rounded-3xl bg-ink text-pearl p-6">
        <h2 className="font-display text-2xl font-bold text-gold">ملخص الطلب</h2>
        <ul className="mt-4 divide-y divide-white/10 text-sm">
          {items.map((i, n) => (
            <li key={n} className="py-3 flex justify-between gap-3">
              <span>{i.product_name}{i.variant_label ? ` (${i.variant_label})` : ""} × {i.qty.toLocaleString("ar")}</span>
              <span className="shrink-0">{formatBHD(i.line_minor)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 text-sm">
          <p className="flex justify-between"><span>المجموع الفرعي</span><span>{formatBHD(o.subtotal_minor)}</span></p>
          {Number(o.discount_minor) > 0 && <p className="flex justify-between text-emerald-300"><span>الخصم</span><span>−{formatBHD(o.discount_minor)}</span></p>}
          <p className="flex justify-between"><span>الشحن إلى {o.country_ar}</span><span>{Number(o.shipping_minor) === 0 ? "مجاني" : formatBHD(o.shipping_minor)}</span></p>
          <p className="flex justify-between font-bold text-lg border-t border-white/15 pt-3 text-gold"><span>الإجمالي</span><span>{formatBHD(o.total_minor)}</span></p>
        </div>
      </section>
      <p className="mt-6 mb-4 text-xs opacity-60 text-center">تاريخ الطلب: {o.created_at.toLocaleDateString("ar-BH")}</p>
    </main>
  );
}
