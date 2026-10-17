import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { formatBHD } from "@/lib/money";

export const dynamic = "force-dynamic";

const FULFILL: Record<string, string> = { new: "قيد المراجعة", processing: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي" };
const PAY: Record<string, string> = { unpaid: "بانتظار الدفع", pending: "بانتظار الدفع", confirming: "قيد التأكيد", paid: "مدفوع",
  failed: "فشلت العملية", expired: "انتهت المهلة", refunded: "مستردّ" };

export default async function OrderPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!/^[A-Z2-9]{12}$/.test(ref)) notFound();
  // Only non-identifying details are shown: no address, phone, or email.
  const [o] = await sql<{ id: string; fulfillment_status: string; payment_status: string; is_test: boolean;
    subtotal_minor: string; shipping_minor: string; total_minor: string; country_ar: string;
    tracking_ref: string | null; created_at: Date }[]>`
    select o.id, o.fulfillment_status, o.payment_status, o.is_test, o.subtotal_minor, o.shipping_minor,
           o.total_minor, c.name_ar as country_ar, o.tracking_ref, o.created_at
    from orders o join countries c on c.iso2 = o.country_iso2 where o.ref = ${ref}`;
  if (!o) notFound();
  const items = await sql<{ product_name: string; variant_label: string | null; qty: number; line_minor: string }[]>`
    select product_name, variant_label, qty, line_minor from order_items where order_id = ${o.id}`;
  const shown = `LU-${ref.slice(0, 4)}-${ref.slice(4, 8)}-${ref.slice(8)}`;
  const awaiting = o.payment_status === "unpaid" || o.payment_status === "pending";

  return (
    <main className="max-w-2xl mx-auto px-4 mt-10">
      <h1 className="text-2xl font-bold">شكراً لطلبك</h1>
      <p className="mt-2">رقم الطلب: <span dir="ltr" className="font-mono font-bold">{shown}</span></p>
      <p className="text-sm opacity-60">احتفظ بهذا الرقم لمتابعة طلبك.</p>
      {o.is_test && <p className="mt-4 bg-amber-100 text-amber-900 p-3 text-sm">هذا طلب تجريبي ولن يتم تجهيزه أو شحنه.</p>}
      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <p className="border border-beige p-3">حالة الدفع<br /><b>{PAY[o.payment_status] ?? o.payment_status}</b></p>
        <p className="border border-beige p-3">حالة الطلب<br /><b>{FULFILL[o.fulfillment_status] ?? o.fulfillment_status}</b></p>
      </div>
      {awaiting && !o.is_test ? null : null}
      {awaiting && (
        <p className="mt-4 text-sm leading-7">تم تسجيل طلبك. الدفع بالعملات الرقمية غير متاح بعد، ولن يُعتبر الطلب مدفوعاً إلا بعد تأكيد الدفع فعلياً.</p>
      )}
      {o.tracking_ref && <p className="mt-4 text-sm">رقم التتبع: <span dir="ltr">{o.tracking_ref}</span></p>}
      <ul className="mt-6 divide-y divide-beige text-sm">
        {items.map((i, n) => (
          <li key={n} className="py-3 flex justify-between gap-3">
            <span>{i.product_name}{i.variant_label ? ` (${i.variant_label})` : ""} × {i.qty.toLocaleString("ar")}</span>
            <span>{formatBHD(i.line_minor)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1 text-sm">
        <p className="flex justify-between"><span>المجموع الفرعي</span><span>{formatBHD(o.subtotal_minor)}</span></p>
        <p className="flex justify-between"><span>الشحن إلى {o.country_ar}</span><span>{Number(o.shipping_minor) === 0 ? "مجاني" : formatBHD(o.shipping_minor)}</span></p>
        <p className="flex justify-between font-bold text-base border-t border-beige pt-2"><span>الإجمالي</span><span>{formatBHD(o.total_minor)}</span></p>
      </div>
      <p className="mt-6 text-xs opacity-60">تاريخ الطلب: {o.created_at.toLocaleDateString("ar-BH")}</p>
    </main>
  );
}
