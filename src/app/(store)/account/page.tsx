import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ActionForm from "@/components/account/ActionForm";
import { requireAccount } from "@/lib/account-auth";
import { getBalance, getWalletSettings } from "@/lib/wallet";
import { formatBHD } from "@/lib/money";
import { logout, resendVerification } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حسابي", robots: { index: false } };

const DEP: Record<string, string> = { unpaid: "بانتظار الدفع", pending: "بانتظار الدفع", confirming: "قيد التأكيد", paid: "مكتمل",
  partially_paid: "مدفوع جزئياً", failed: "فشلت", expired: "منتهية", refunded: "مستردّة" };
const KIND: Record<string, string> = { deposit: "إيداع", purchase: "شراء", refund: "استرداد", adjustment: "تعديل" };
const PAY: Record<string, string> = { unpaid: "بانتظار الدفع", pending: "بانتظار الدفع", confirming: "قيد التأكيد", paid: "مدفوع", partially_paid: "مدفوع جزئياً", failed: "فشل", expired: "منتهي", refunded: "مستردّ" };
const day = (d: Date) => d.toLocaleDateString("ar-BH");

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const q = await searchParams;
  const a = await requireAccount("/account");
  const ws = await getWalletSettings();
  if (!ws.enabled) return <main className="max-w-xl mx-auto px-4 py-24 text-center">الحسابات غير متاحة حالياً.</main>;

  const balance = await getBalance(a.id);
  const deposits = await sql<{ ref: string; amount_minor: string; status: string; created_at: Date }[]>`
    select ref, amount_minor, status, created_at from wallet_deposits where account_id = ${a.id} order by created_at desc limit 6`;
  const tx = await sql<{ kind: string; amount_minor: string; balance_after_minor: string; created_at: Date; note: string | null }[]>`
    select kind, amount_minor, balance_after_minor, created_at, note from wallet_transactions where account_id = ${a.id} order by created_at desc, id desc limit 15`;
  // Orders are matched by the account's VERIFIED email address.
  const orders = a.verified ? await sql<{ ref: string; total_minor: string; payment_status: string; fulfillment_status: string; created_at: Date }[]>`
    select ref, total_minor, payment_status, fulfillment_status, created_at from orders
    where lower(customer_email) = ${a.email} order by created_at desc limit 8` : [];

  return (
    <>
      <PageHeader eyebrow="مرحباً" title={a.name} />
      <main className="max-w-5xl mx-auto px-4 mt-10 space-y-6">
        {q.verified && <p role="status" className="rounded-2xl bg-emerald-50 text-emerald-900 px-5 py-3 text-sm">تم تأكيد بريدك الإلكتروني. شكراً لك.</p>}
        {a.blocked && <p role="alert" className="rounded-2xl bg-red-50 text-red-800 px-5 py-3 text-sm">هذا الحساب موقوف حالياً. تواصل معنا.</p>}
        {!a.verified && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
            <p className="text-sm leading-7">أكّد بريدك الإلكتروني (<bdi dir="ltr">{a.email}</bdi>) لتتمكن من الإيداع والدفع من المحفظة.</p>
            <div className="max-w-xs"><ActionForm action={resendVerification} submit="إرسال رابط التأكيد" fields={[]} /></div>
          </div>
        )}

        <section className="rounded-3xl bg-ink text-pearl p-7 md:p-9 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-gold text-sm tracking-widest">رصيد المحفظة</p>
            <p className="mt-2 font-display text-5xl font-bold gold-text">{formatBHD(balance)}</p>
            <p className="mt-2 text-xs opacity-60">رصيد للشراء من المتجر.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/account/deposit" className="btn-gold">إيداع رصيد</Link>
            <Link href="/shop" className="btn-ghost">تسوّق الآن</Link>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-3xl border border-beige bg-white/70 p-5">
            <h2 className="font-display text-2xl font-bold mb-3">آخر الإيداعات</h2>
            {deposits.length === 0 ? <p className="text-sm opacity-60">لا توجد إيداعات بعد.</p> : (
              <ul className="divide-y divide-beige text-sm">
                {deposits.map((d) => (
                  <li key={d.ref} className="py-2.5 flex items-center justify-between gap-3">
                    <Link href={`/account/deposit/${d.ref}`} className="hover:underline"><b>{formatBHD(d.amount_minor)}</b><span className="block text-xs opacity-60">{day(d.created_at)}</span></Link>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${d.status === "paid" ? "bg-emerald-100 text-emerald-800" : d.status === "failed" || d.status === "expired" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{DEP[d.status] ?? d.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-3xl border border-beige bg-white/70 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-2xl font-bold">حركة المحفظة</h2>
              <a href="/account/statement" className="text-xs underline">تنزيل كشف الحساب</a>
            </div>
            {tx.length === 0 ? <p className="text-sm opacity-60">لا توجد حركات بعد.</p> : (
              <ul className="divide-y divide-beige text-sm">
                {tx.map((t, i) => (
                  <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                    <span>{KIND[t.kind] ?? t.kind}<span className="block text-xs opacity-60">{day(t.created_at)}</span></span>
                    <span dir="ltr" className={`font-bold ${Number(t.amount_minor) > 0 ? "text-emerald-700" : "text-red-700"}`}>{Number(t.amount_minor) > 0 ? "+" : "−"}{formatBHD(Math.abs(Number(t.amount_minor)))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {a.verified && (
          <section className="rounded-3xl border border-beige bg-white/70 p-5">
            <h2 className="font-display text-2xl font-bold mb-3">طلباتي</h2>
            {orders.length === 0 ? <p className="text-sm opacity-60">لا توجد طلبات مرتبطة ببريدك بعد.</p> : (
              <ul className="divide-y divide-beige text-sm">
                {orders.map((o) => (
                  <li key={o.ref} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/order/${o.ref}`} className="hover:underline"><b dir="ltr">LU-{o.ref.slice(0, 4)}-{o.ref.slice(4, 8)}-{o.ref.slice(8)}</b><span className="block text-xs opacity-60">{day(o.created_at)}</span></Link>
                    <span>{formatBHD(o.total_minor)}</span><span className="text-xs opacity-70">{PAY[o.payment_status] ?? o.payment_status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="text-sm flex flex-wrap gap-4 justify-center pt-2">
          <Link href="/account/settings" className="underline">إعدادات الحساب</Link>
          <form action={logout}><button className="underline">تسجيل الخروج</button></form>
        </p>
      </main>
    </>
  );
}
