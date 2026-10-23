import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import AutoRefresh from "@/components/AutoRefresh";
import { requireAccount } from "@/lib/account-auth";
import { getWalletSettings } from "@/lib/wallet";
import { buildOnrampUrl } from "@/lib/converter";
import { formatBHD } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حالة الإيداع", robots: { index: false } };

const STATUS: Record<string, string> = { unpaid: "بانتظار الدفع", pending: "بانتظار الدفع", confirming: "قيد التأكيد على الشبكة", paid: "اكتمل وأُضيف إلى رصيدك",
  partially_paid: "وصلت دفعة أقل من المطلوب", failed: "فشلت العملية", expired: "انتهت المهلة", refunded: "مستردّ" };
const trusted = (u: string) => { try { const x = new URL(u); return x.protocol === "https:" && x.hostname.endsWith("nowpayments.io"); } catch { return false; } };

export default async function DepositStatus({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!/^[A-Z2-9]{12}$/.test(ref)) notFound();
  const a = await requireAccount(`/account/deposit/${ref}`);
  // A customer can only ever see their OWN deposits.
  const [d] = await sql<{ amount_minor: string; method: string; status: string; invoice_url: string | null; pay_address: string | null;
    pay_currency: string | null; pay_amount: string | null; usd_amount: string }[]>`
    select amount_minor, method, status, invoice_url, pay_address, pay_currency, pay_amount, usd_amount
    from wallet_deposits where ref = ${ref} and account_id = ${a.id}`;
  if (!d) notFound();
  const ws = await getWalletSettings();
  const live = ["unpaid", "pending", "confirming"].includes(d.status);
  const cardUrl = d.method === "card" && d.pay_address && ws.card_url_template
    ? buildOnrampUrl(ws.card_url_template, { address: d.pay_address, amount_usd: d.usd_amount, amount_crypto: d.pay_amount ?? "", currency: d.pay_currency ?? "", ref, email: a.email }) : null;
  const note = "mt-4 rounded-2xl bg-pearl p-4 text-sm leading-7";

  return (
    <>
      {live && <AutoRefresh />}
      <PageHeader eyebrow="المحفظة" title="حالة الإيداع" />
      <main className="max-w-xl mx-auto px-4 mt-10">
        <div className="rounded-3xl border border-beige bg-white/70 p-6 space-y-3">
          <p className="text-sm opacity-60">رقم العملية: <b dir="ltr" className="font-mono">{ref}</b></p>
          <p className="font-display text-4xl font-bold">{formatBHD(d.amount_minor)}</p>
          <p className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${d.status === "paid" ? "bg-emerald-100 text-emerald-800" : d.status === "failed" || d.status === "expired" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{STATUS[d.status] ?? d.status}</p>

          {live && d.method === "crypto" && d.invoice_url && trusted(d.invoice_url) && (
            <p className={note}>أكمل الدفع من صفحة مزوّد الدفع. بعد وصول دفعتك وتأكيدها تُضاف إلى رصيدك تلقائياً وتتحدّث هذه الصفحة. <a href={d.invoice_url} className="btn-gold mt-3 w-full">متابعة الدفع</a></p>
          )}
          {live && d.method === "card" && (
            <div className={note}>
              {cardUrl ? <p>أكمل الدفع بالبطاقة عند مزوّد التحويل. بعد أن يرسل العملة الرقمية وتصل وتُؤكَّد، يُضاف المبلغ إلى رصيدك تلقائياً. <a href={cardUrl} target="_blank" rel="noopener noreferrer" className="btn-gold mt-3 w-full">الدفع بالبطاقة</a></p>
                : <p>رابط الدفع بالبطاقة غير متاح الآن. يمكنك التحويل يدوياً بالعملة الرقمية إلى العنوان أدناه.</p>}
              {d.pay_address && (
                <div className="mt-4 space-y-1 text-xs">
                  <p>العملة: <b dir="ltr">{d.pay_currency}</b></p>
                  <p>المبلغ بالضبط: <b dir="ltr">{d.pay_amount}</b></p>
                  <p>العنوان:</p><p dir="ltr" className="font-mono break-all bg-white rounded-lg p-2 select-all">{d.pay_address}</p>
                  <p className="text-red-700">أرسل نفس العملة والشبكة فقط. إرسال عملة أو شبكة مختلفة قد يؤدي إلى فقدان المبلغ.</p>
                </div>
              )}
            </div>
          )}
          {d.status === "partially_paid" && <p className={note}>وصلت دفعة أقل من المبلغ المطلوب ولم يُضف رصيد بعد. تواصل معنا مع ذكر رقم العملية.</p>}
          {(d.status === "failed" || d.status === "expired") && <p className={note}>لم يكتمل الإيداع. إذا كنت قد أرسلت دفعة، تواصل معنا مع رقم العملية.</p>}
          <div className="pt-3 flex gap-3 text-sm"><Link href="/account" className="underline">العودة إلى حسابي</Link><Link href="/account/deposit" className="underline">إيداع جديد</Link></div>
        </div>
      </main>
    </>
  );
}
